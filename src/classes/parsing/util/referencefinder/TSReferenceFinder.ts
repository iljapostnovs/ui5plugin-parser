/* eslint-disable @typescript-eslint/indent */
import * as path from "path";
import { MethodDeclaration, ts } from "ts-morph";
import { UI5TSParser } from "../../../../parser/UI5TSParser";
import { AnyCustomTSClass, ICustomTSField, ICustomTSMethod } from "../../../../Types";
import { CustomTSClass, ICustomClassTSConstructor } from "../../ui5class/ts/CustomTSClass";
import { CustomTSObject } from "../../ui5class/ts/CustomTSObject";
import { IRange, RangeAdapter } from "../range/adapters/RangeAdapter";
import ReferenceFinderBase, { ILocation, IReferenceCodeLensCacheable } from "./ReferenceFinderBase";

export class TSReferenceFinder extends ReferenceFinderBase<
	ICustomTSField | ICustomTSMethod | ICustomClassTSConstructor,
	UI5TSParser,
	AnyCustomTSClass
> {
	public getReferenceLocations(member: ICustomTSField | ICustomTSMethod | ICustomClassTSConstructor) {
		const locations: ILocation[] = [];

		const UIClass = this._parser.classFactory.getUIClass(member.owner);
		if (UIClass instanceof CustomTSClass || UIClass instanceof CustomTSObject) {
			this._addLocationsFromUIClass(member, UIClass, locations);

			if (member.name !== "constructor") {
				const viewsAndFragments = this._parser.classFactory.getViewsAndFragmentsOfControlHierarchically(
					UIClass,
					[],
					true,
					true,
					true
				);
				const viewAndFragmentArray = [...viewsAndFragments.fragments, ...viewsAndFragments.views];
				viewAndFragmentArray.forEach(XMLDoc => {
					this._addLocationsFromXMLDocument(XMLDoc, member, locations);
				});
			}
		}

		return locations;
	}

	protected _addLocationsFromUIClass(
		member: ICustomTSField | ICustomTSMethod | ICustomClassTSConstructor,
		UIClass: AnyCustomTSClass,
		locations: ILocation[]
	) {
		const cache = UIClass.getCache<IReferenceCodeLensCacheable>("referenceCodeLensCache") || {};
		if (cache[member.owner]?.[`_${member.name}`]) {
			locations.push(...cache[member.owner][`_${member.name}`]);
			return;
		}

		const references = member.node?.findReferences().flatMap(reference => reference.getReferences());
		const currentLocations: ILocation[] =
			references
				?.filter(reference => {
					const notAReferenceToItself =
						path.resolve(reference.getSourceFile().getFilePath()) !== UIClass.fsPath ||
						(!member.node?.isKind(ts.SyntaxKind.Constructor) &&
							reference.getNode().getStart() !==
								(<MethodDeclaration>member.node).getNameNode().getStart()) ||
						(member.node?.isKind(ts.SyntaxKind.Constructor) &&
							reference.getNode().getStart() !== member.node.getStart());
					return notAReferenceToItself;
				})
				.map(reference => {
					const range = RangeAdapter.offsetsRange(
						reference.getSourceFile().getFullText(),
						reference.getTextSpan().getStart(),
						reference.getTextSpan().getEnd()
					);
					let referenceData: [IRange, string] | undefined;
					if (range) {
						referenceData = [range, path.resolve(reference.getSourceFile().getFilePath())];
					}
					return referenceData;
				})
				.filter(rangeData => !!rangeData)
				.map(rangeData => {
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					return { filePath: rangeData![1] || "", range: rangeData![0] };
				}) ?? [];

		if (!cache[member.owner]) {
			cache[member.owner] = {};
		}
		cache[member.owner][`_${member.name}`] = currentLocations;
		UIClass.setCache("referenceCodeLensCache", cache);
		locations.push(...currentLocations);
	}
}
