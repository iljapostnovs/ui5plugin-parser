/* eslint-disable @typescript-eslint/indent */
import ParserPool from "../../../../parser/pool/ParserPool";
import { UI5JSParser } from "../../../../parser/UI5JSParser";
import { FieldsAndMethodForPositionBeforeCurrentStrategy } from "../../jsparser/typesearch/FieldsAndMethodForPositionBeforeCurrentStrategy";
import { CustomJSClass, ICustomClassJSField, ICustomClassJSMethod } from "../../ui5class/js/CustomJSClass";
import { RangeAdapter } from "../range/adapters/RangeAdapter";
import ReferenceFinderBase, { ILocation, IReferenceCodeLensCacheable } from "./ReferenceFinderBase";

export class ReferenceFinder extends ReferenceFinderBase<
	ICustomClassJSMethod | ICustomClassJSField,
	UI5JSParser,
	CustomJSClass
> {
	public getReferenceLocations(member: ICustomClassJSMethod | ICustomClassJSField) {
		const locations: ILocation[] = [];

		const UIClasses = ParserPool.getAllCustomUIClasses().filter(
			UIClass => UIClass instanceof CustomJSClass
		) as CustomJSClass[];
		UIClasses.forEach(UIClass => {
			this._addLocationsFromUIClass(member, UIClass, locations);
		});

		const UIClass = this._parser.classFactory.getUIClass(member.owner);
		if (UIClass instanceof CustomJSClass) {
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

		return locations;
	}

	protected _addLocationsFromUIClass(
		member: ICustomClassJSMethod | ICustomClassJSField,
		UIClass: CustomJSClass,
		locations: ILocation[]
	) {
		const cache = UIClass.getCache<IReferenceCodeLensCacheable>("referenceCodeLensCache") || {};
		if (cache[member.owner]?.[`_${member.name}`]) {
			locations.push(...cache[member.owner][`_${member.name}`]);
		} else if (UIClass.fsPath) {
			const results: RegExpExecArray[] = this._getCurrentMethodMentioning(member, UIClass);

			const currentLocations: ILocation[] = [];
			const strategy = new FieldsAndMethodForPositionBeforeCurrentStrategy(
				this._parser.syntaxAnalyser,
				this._parser
			);
			results.forEach(result => {
				const calleeClassName = strategy.acornGetClassName(UIClass.className, result.index);
				const calleeUIClass = calleeClassName && this._parser.classFactory.getUIClass(calleeClassName);
				if (
					calleeUIClass &&
					calleeUIClass instanceof CustomJSClass &&
					calleeClassName &&
					(this._parser.classFactory.isClassAChildOfClassB(calleeClassName, member.owner) ||
						(UIClass.className === calleeClassName &&
							this._parser.classFactory.isClassAChildOfClassB(member.owner, calleeClassName) &&
							this._parser.classFactory.isClassAChildOfClassB(member.owner, UIClass.className)))
				) {
					const range = RangeAdapter.offsetsRange(
						UIClass.classText,
						result.index,
						result.index + member.name.length
					);
					if (range) {
						currentLocations.push({ filePath: UIClass.fsPath || "", range: range });
					}
				}
			});
			if (currentLocations.length > 0) {
				locations.push(...currentLocations);
			}
			if (!cache[member.owner]) {
				cache[member.owner] = {};
			}
			cache[member.owner][`_${member.name}`] = currentLocations;
			UIClass.setCache("referenceCodeLensCache", cache);
		}
	}

	private _getCurrentMethodMentioning(member: ICustomClassJSMethod | ICustomClassJSField, UIClass: CustomJSClass) {
		const regexp = new RegExp(`(?<=\\.)${member.name}(\\(|\\)|\\,|\\.|\\s|;|\\[|\\])(?!=)`, "g");
		const results: RegExpExecArray[] = [];
		let result = regexp.exec(UIClass.classText);
		while (result) {
			results.push(result);
			result = regexp.exec(UIClass.classText);
		}
		return results;
	}
}
