import { IUI5Parser } from "../../IUI5Parser";
import { IMember, IUIMethod } from "../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { ICommentPositions, IXMLFile } from "./FileReader";

export interface ITag {
	text: string;
	positionBegin: number;
	positionEnd: number;
	attributes?: string[];
}

export interface IHierarchicalTag extends ITag {
	tags: IHierarchicalTag[];
}
export enum PositionType {
	InExistingAttribute = "1",
	InNewAttribute = "7",
	Content = "2",
	InTheString = "3",
	InTheClassName = "4",
	InComments = "5",
	InBodyOfTheClass = "6"
}

function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface IXMLDocumentIdData {
	id: string;
	className: string;
	tagText: string;
	sourceClassName: string;
}

export class XMLParser {
	private readonly _parser: IUI5Parser;
	constructor(parser: IUI5Parser) {
		this._parser = parser;
	}
	getXMLFunctionCallTagsAndAttributes(
		viewOrFragment: IXMLFile,
		eventHandlerName: string,
		functionCallClassName?: string
	) {
		const tagAndAttributes: { tag: ITag; attributes: string[] }[] = [];
		const positions = this.getPositionsOfFunctionCallInXMLText(eventHandlerName, viewOrFragment.content);
		if (positions.length > 0) {
			positions.forEach(position => {
				const tag = this.getTagInPosition(viewOrFragment, position);
				if (
					!tagAndAttributes.find(tagAndAttribute => tagAndAttribute.tag.positionBegin === tag.positionBegin)
				) {
					const attributes = this.getAttributesOfTheTag(tag);
					const eventHandlerAttributes = attributes?.filter(attribute => {
						const { attributeValue } = this.getAttributeNameAndValue(attribute);
						let currentEventHandlerName = this.getEventHandlerNameFromAttributeValue(attributeValue);

						if (
							currentEventHandlerName !== eventHandlerName &&
							currentEventHandlerName.includes(eventHandlerName)
						) {
							//TODO: refactoring
							const results = new RegExp(`((\\..*?\\.)|("|\\.))${eventHandlerName}("|\\.|'|\\(|$)`).exec(
								currentEventHandlerName
							);
							const filteredResults = results && results[0].split(".").filter(result => !!result);
							if (filteredResults?.length === 2) {
								if (functionCallClassName) {
									const handlerField = filteredResults[0];
									const responsibleClassName =
									this._parser.fileReader.getResponsibleClassNameForViewOrFragment(viewOrFragment);
									if (responsibleClassName) {
										const fields =
											this._parser.classFactory.getClassFields(
												responsibleClassName
											);
										const field = fields.find(field => field.name === handlerField);
										if (
											field?.type &&
											!this._parser.classFactory.isClassAChildOfClassB(field.type, functionCallClassName)
										) {
											return false;
										}
									}
								}
								currentEventHandlerName = filteredResults[1].substring(
									0,
									filteredResults[1].length - 1
								); //removes "'"
							} else if (filteredResults && filteredResults.length > 2) {
								//maybe static classes e.g. com.test.formatter.test
								const manifest =
									this._parser.fileReader.getManifestForClass(
										currentEventHandlerName
									);
								if (manifest) {
									const parts = currentEventHandlerName.split(".");
									const staticEventHandlerName = parts.pop() || "";
									if (
										parts.length > 0 &&
										functionCallClassName &&
										parts.join(".") === functionCallClassName
									) {
										currentEventHandlerName = staticEventHandlerName;
									}
								}
							}
							if (
								currentEventHandlerName !== eventHandlerName &&
								currentEventHandlerName.includes(eventHandlerName)
							) {
								const results = new RegExp(`(\\.|"|')${eventHandlerName}("|'|\\(|\\.)`).exec(
									currentEventHandlerName
								);
								if (results) {
									const responsibleClassName =
									this._parser.fileReader.getResponsibleClassNameForViewOrFragment(viewOrFragment);
									if (functionCallClassName && responsibleClassName) {
										let handlerField = results[0];
										if (handlerField.startsWith(".")) {
											handlerField = handlerField.substring(1, handlerField.length);
										}
										const memberName = handlerField.substring(0, handlerField.length - 1);
										const fields =
											this._parser.classFactory.getClassFields(
												responsibleClassName
											);
										const methods =
											this._parser.classFactory.getClassMethods(
												responsibleClassName
											);
										const members: IMember[] = [...fields, ...methods];
										const member = members.find(member => member.name === memberName);
										const classFactory = this._parser.classFactory;
										if (
											!member ||
											!classFactory.isClassAChildOfClassB(
												responsibleClassName,
												functionCallClassName
											)
										) {
											return false;
										} else {
											currentEventHandlerName = memberName;
										}
									} else {
										currentEventHandlerName = eventHandlerName;
									}
								} else {
									const manifest =
										this._parser.fileReader.getManifestForClass(
											currentEventHandlerName
										);
									const parts = currentEventHandlerName.split(".");
									if (manifest) {
										currentEventHandlerName = parts.pop() || "";
										if (
											parts.length > 0 &&
											functionCallClassName &&
											parts.join(".") !== functionCallClassName
										) {
											return false;
										}
									} else if (parts.length === 2) {
										//for require in XML
										const allTags = this.getAllTags(viewOrFragment);
										const requireAttributes = this.getAllAttributesWithRequire(allTags);
										const className = parts.shift();
										const methodName = parts.shift();
										const classPath =
											className && this.getClassPathFromRequire(requireAttributes, className);
										if (classPath) {
											const className = classPath.replace(/\//g, ".");
											if (
												functionCallClassName &&
												methodName &&
												functionCallClassName !== className
											) {
												return false;
											} else if (methodName) {
												currentEventHandlerName = methodName;
											}
										}
									}
								}
							}
						} else if (functionCallClassName && currentEventHandlerName === eventHandlerName) {
							const responsibleClassName =
							this._parser.fileReader.getResponsibleClassNameForViewOrFragment(viewOrFragment);
							if (responsibleClassName !== functionCallClassName) {
								return false;
							}
						}

						return currentEventHandlerName === eventHandlerName;
					});
					if (eventHandlerAttributes && eventHandlerAttributes.length > 0) {
						tagAndAttributes.push({ tag, attributes: eventHandlerAttributes });
					}
				}
			});
		}

		return tagAndAttributes;
	}
	getClassPathFromRequire(attributesWithRequire: string[], className: string) {
		return attributesWithRequire.reduce((classPath: string, attribute) => {
			if (!classPath) {
				const attributeValue = this.getAttributeNameAndValue(attribute).attributeValue;
				try {
					const evaluatedValue = eval(`(${attributeValue})`);
					if (typeof evaluatedValue === "object") {
						classPath = evaluatedValue[className];
					}
				} catch (oError) {
					classPath = "";
				}
			}
			return classPath;
		}, "");
	}

	getAllAttributesWithRequire(tags: ITag[]) {
		return tags.reduce((requireTags: string[], tag) => {
			const attributes = this.getAttributesOfTheTag(tag);
			const requireAttributes = attributes?.filter(attribute =>
				this.getAttributeNameAndValue(attribute).attributeName.endsWith(":require")
			);
			if (requireAttributes && requireAttributes.length > 0) {
				requireTags.push(...requireAttributes);
			}
			return requireTags;
		}, []);
	}

	getAllIDsInCurrentView(XMLFile: IXMLFile) {
		const result: IXMLDocumentIdData[] = [];

		const allTags = this.getAllTags(XMLFile);
		allTags.forEach(tag => {
			const idAttribute = this.getAttributesOfTheTag(tag)?.find(
				attribute => this.getAttributeNameAndValue(attribute).attributeName === "id"
			);
			if (idAttribute) {
				const className = this.getClassNameInPosition(XMLFile, tag.positionBegin + 1);

				result.push({
					className: className,
					id: this.getAttributeNameAndValue(idAttribute).attributeValue,
					tagText: tag.text,
					sourceClassName: XMLFile.name
				});
			}
		});

		return result;
	}
	getLibraryNameInPosition(XMLFile: IXMLFile, currentPosition: number) {
		const currentTagText = this.getTagInPosition(XMLFile, currentPosition).text;
		const tagPrefix = this.getTagPrefix(currentTagText);
		const libraryPath = this.getLibraryPathFromTagPrefix(XMLFile, tagPrefix, currentPosition);

		if (!libraryPath) {
			const error = new Error(`xmlns:${tagPrefix} is not defined`);
			error.name = "LibraryPathException";
			throw error;
		}

		return libraryPath;
	}

	getClassNameInPosition(XMLFile: IXMLFile, currentPosition: number) {
		let currentPositionClass = "";
		const currentTagText = this.getTagInPosition(XMLFile, currentPosition).text;
		const tagPrefix = this.getTagPrefix(currentTagText);
		const className = this.getClassNameFromTag(currentTagText);
		if (className) {
			const libraryPath = this.getLibraryPathFromTagPrefix(XMLFile, tagPrefix, currentPosition);
			if (libraryPath) {
				currentPositionClass = [libraryPath, className].join(".");
			}
		}

		return currentPositionClass;
	}

	getParentTagAtPosition(XMLFile: IXMLFile, position: number, closedTags: string[] = []) {
		let parentTag: ITag = {
			positionBegin: 0,
			positionEnd: 0,
			text: ""
		};
		const XMLText = XMLFile.content;

		if (XMLText && position) {
			const { positionBegin, positionEnd } = this.getTagBeginEndPosition(XMLFile, position);
			const tag = this.getTagInPosition(XMLFile, position);
			const croppedTag = tag.text.substring(1, tag.text.length - 1); // remove < >
			const tagIsSelfClosed = croppedTag.endsWith("/");
			const itIsClosureTag = croppedTag.startsWith("/");
			if (tagIsSelfClosed) {
				parentTag = this.getParentTagAtPosition(XMLFile, positionBegin - 1, closedTags);
			} else if (itIsClosureTag) {
				closedTags.push(croppedTag.substring(1, croppedTag.length));
				parentTag = this.getParentTagAtPosition(XMLFile, positionBegin - 1, closedTags);
			} else if (closedTags.length > 0) {
				closedTags.pop();
				parentTag = this.getParentTagAtPosition(XMLFile, positionBegin - 1, closedTags);
			} else {
				const className = this.getClassNameFromTag(tag.text);
				if (closedTags.includes(className)) {
					closedTags.splice(closedTags.indexOf(className), 1);
					parentTag = this.getParentTagAtPosition(XMLFile, positionBegin - 1, closedTags);
				} else {
					parentTag.positionBegin = positionBegin;
					parentTag.positionEnd = positionEnd;
					parentTag.text = tag.text;
				}
			}
		}

		return parentTag;
	}

	public getTagInPosition(XMLFile: IXMLFile, position: number) {
		let tag = this._getTagInPosition(XMLFile, position);
		if (tag) {
			return tag;
		}

		const XMLText = XMLFile.content;
		const { positionBegin, positionEnd } = this.getTagBeginEndPosition(XMLFile, position);
		const tagText = XMLText.substring(positionBegin, positionEnd);
		tag = {
			text: tagText,
			positionBegin: positionBegin,
			positionEnd: positionEnd
		};
		return tag;
	}

	private _getTagInPosition(XMLFile: IXMLFile, position: number) {
		if (!XMLFile.XMLParserData || XMLFile.XMLParserData?.tags.length === 0) {
			this.getAllTags(XMLFile);
		}
		if (XMLFile.XMLParserData?.tags) {
			return this._findInPosition(XMLFile.XMLParserData.tags, position);
		}
	}

	private _findInPosition(tags: ITag[], position: number, currentIndex = 0): ITag | undefined {
		let tag: ITag | undefined;
		if (tags.length === 0) {
			return tag;
		}
		const correctPosition =
			tags[currentIndex].positionBegin <= position && tags[currentIndex].positionEnd >= position;
		if (tags.length === 1 && !correctPosition) {
			return tag;
		}
		if (correctPosition) {
			tag = tags[currentIndex];
		} else {
			const middleIndex = Math.floor(tags.length / 2); //5 -> 2
			const firstArrayHalf = tags.slice(0, middleIndex);
			const secondArrayHalf = tags.slice(middleIndex, tags.length);
			let nextTags: ITag[] = [];
			if (secondArrayHalf[0]?.positionBegin <= position) {
				nextTags = secondArrayHalf;
			} else {
				nextTags = firstArrayHalf;
			}
			tag = this._findInPosition(nextTags, position, currentIndex);
		}

		return tag;
	}

	public getTagBeginEndPosition(XMLFile: IXMLFile, position: number) {
		let i = position;
		let tagPositionBegin = 0;
		let tagPositionEnd = 0;

		const XMLText = XMLFile.content;
		while (
			i > 0 &&
			(XMLText[i] !== "<" ||
				!this.getIfPositionIsNotInComments(XMLFile, i) ||
				this.getIfPositionIsInString(XMLFile, i)) ||
                XMLText.substring(i, i + 2).toLowerCase() === "<!"
		) {
			i--;
		}
		tagPositionBegin = i;

		while (
			i < XMLText.length &&
			(XMLText[i] !== ">" ||
				!this.getIfPositionIsNotInComments(XMLFile, i) ||
				this.getIfPositionIsInString(XMLFile, i))
		) {
			i++;
		}
		tagPositionEnd = i + 1;

		return {
			positionBegin: tagPositionBegin,
			positionEnd: tagPositionEnd
		};
	}

	public getIfPositionIsNotInComments(document: IXMLFile, position: number) {
		let comments: ICommentPositions = {};

		if (document.XMLParserData?.comments) {
			comments = document.XMLParserData.comments;
		} else {
			const regExp = new RegExp("<!--(.|\\s)*?-->", "g");

			const commentResults: RegExpExecArray[] = [];
			let result = regExp.exec(document.content);
			while (result) {
				commentResults.push(result);
				result = regExp.exec(document.content);
			}

			comments = new Array(document.content.length).fill(true);

			commentResults.forEach(commentResult => {
				const indexBegin = commentResult.index;
				const indexEnd = indexBegin + commentResult[0].length;

				for (let i = indexBegin; i < indexEnd; i++) {
					comments[i] = false;
				}
			});
			if (!document.XMLParserData) {
				this.fillXMLParsedData(document);
			}
			if (document.XMLParserData) {
				document.XMLParserData.comments = comments;
			}
		}

		return comments[position];
	}

	getIfPositionIsInString(XMLFile: IXMLFile, position: number) {
		const XMLText = XMLFile.content;
		let isInString = false;

		if (!XMLFile.XMLParserData) {
			this.fillXMLParsedData(XMLFile);
		}

		if (XMLFile.XMLParserData?.strings) {
			isInString = !!XMLFile.XMLParserData.strings[position];
		} else {
			let quotionMarkCount = 0;
			let secondTypeQuotionMarkCount = 0;

			let i = 0;
			while (i < position) {
				if (XMLText[i] === "\"" && this.getIfPositionIsNotInComments(XMLFile, i)) {
					quotionMarkCount++;
				}
				if (XMLText[i] === "'" && this.getIfPositionIsNotInComments(XMLFile, i)) {
					secondTypeQuotionMarkCount++;
				}

				i++;
			}

			isInString = quotionMarkCount % 2 === 1 || secondTypeQuotionMarkCount % 2 === 1;
		}

		return isInString;
	}

	getTagPrefix(tagText: string) {
		let tagPrefix = "";

		let i = 0;

		while (i < tagText.length && !/\s|>/.test(tagText[i])) {
			i++;
		}

		const tagName = tagText.substring(0, i).replace("<", "");
		const tagNameParts = tagName.split(":");

		if (tagNameParts.length > 1) {
			tagPrefix = tagNameParts[0];
		}

		if (tagPrefix.startsWith("/")) {
			tagPrefix = tagPrefix.substring(1, tagPrefix.length);
		}

		return tagPrefix;
	}

	getFullClassNameFromTag(tag: ITag, XMLFile: IXMLFile) {
		let className = this.getClassNameFromTag(tag.text);
		const classTagPrefix = this.getTagPrefix(tag.text);
		const libraryPath = this.getLibraryPathFromTagPrefix(XMLFile, classTagPrefix, tag.positionEnd);
		if (libraryPath) {
			className = [libraryPath, className].join(".");
		} else {
			className = "";
		}

		return className;
	}

	getClassNameFromTag(tagText: string) {
		let className = "";

		let i = 0;

		while (i < tagText.length && !/\s|>/.test(tagText[i])) {
			i++;
		}

		const tagName = tagText.substring(0, i).replace("<", "");
		const tagNameParts = tagName.split(":");

		if (tagNameParts.length > 1) {
			className = tagNameParts[1];
		} else {
			className = tagNameParts[0];
		}

		if (className.endsWith("/")) {
			className = className.substring(0, className.length - 1);
		}
		if (className.startsWith("/")) {
			className = className.substring(1, className.length);
		}

		return className;
	}

	getLibraryPathFromTagPrefix(XMLFile: IXMLFile, tagPrefix: string, position: number) {
		let libraryPath;
		let regExpBase;
		let delta = 0;
		const XMLText = XMLFile.content;
		const results = XMLFile.XMLParserData?.prefixResults[tagPrefix] || [];
		const tagPositionEnd = this.getTagBeginEndPosition(XMLFile, position).positionEnd;

		if (results.length === 0) {
			if (!tagPrefix) {
				regExpBase = "(?<=xmlns\\s?=\\s?\").*?(?=\")";
			} else {
				regExpBase = `(?<=xmlns(:${tagPrefix})\\s?=\\s?").*?(?=")`;
			}
			const rClassName = new RegExp(regExpBase, "g");

			let classNameResult = rClassName.exec(XMLText);

			while (classNameResult) {
				results.push({
					result: classNameResult[0],
					position: classNameResult.index
				});

				classNameResult = rClassName.exec(XMLText);
				if (results.find(result => result.position === classNameResult?.index)) {
					classNameResult = null;
				}
			}

			if (!XMLFile.XMLParserData) {
				this.fillXMLParsedData(XMLFile);
			}
			if (XMLFile.XMLParserData) {
				XMLFile.XMLParserData.prefixResults[tagPrefix] = results;
			}
		}

		if (results.length > 0) {
			//needed for in-tag xmlns declaration
			//TODO: Make it hierarchical
			delta = Math.abs(position - results[0].position);
			let closestResult = results[0];
			results.forEach(result => {
				const currentDelta = Math.abs(position - result.position);

				if (currentDelta < delta && result.position < tagPositionEnd) {
					libraryPath = result.result;

					delta = currentDelta;
					closestResult = result;
				}
			});

			if (closestResult) {
				libraryPath = closestResult.result;
			}
		}

		return libraryPath;
	}

	getPositionType(XMLFile: IXMLFile, currentPosition: number) {
		let i = currentPosition;
		let tagPositionBegin = 0;
		let tagPositionEnd = 0;
		let positionType: PositionType = PositionType.Content;
		// let positionInString = false; TODO: this

		const XMLText = XMLFile.content;
		if (this.getIfPositionIsInString(XMLFile, currentPosition)) {
			positionType = PositionType.InTheString;
		} else {
			while (i > 0 && XMLText[i] !== "<") {
				i--;
			}
			tagPositionBegin = i;

			while (i < XMLText.length && (XMLText[i] !== ">" || this.getIfPositionIsInString(XMLFile, i))) {
				i++;
			}
			tagPositionEnd = i + 1;

			const positionIsInsideTheClassTag = currentPosition > tagPositionBegin && currentPosition < tagPositionEnd;
			const tagText = XMLText.substring(tagPositionBegin, currentPosition);
			const positionInTheAttributes = /\s/.test(tagText);

			if (positionIsInsideTheClassTag && positionInTheAttributes) {
				positionType = PositionType.InExistingAttribute;

				let attributeIsNew = false;

				let j = currentPosition;
				while (j < XMLText.length && XMLText[j] !== "=") {
					j++;
				}
				const restOfTheAttribute = XMLText.substring(currentPosition, j);

				if (/\s/.test(restOfTheAttribute)) {
					attributeIsNew = true;
				}

				if (attributeIsNew) {
					positionType = PositionType.InNewAttribute;
				}
			} else if (positionIsInsideTheClassTag) {
				positionType = PositionType.InTheClassName;
			} else {
				positionType = PositionType.InBodyOfTheClass;
			}
		}

		return positionType;
	}

	getPositionBeforeStringBegining(XMLViewText: string, currentPosition: number) {
		let i = currentPosition - 1;
		while (XMLViewText[i] !== "\"" && i > 0) {
			i--;
		}
		i--;

		return i;
	}

	getNearestAttribute(XMLViewText: string, currentPosition: number) {
		let i = currentPosition;

		while (!/\s/.test(XMLViewText[i]) && i > 0) {
			i--;
		}

		return XMLViewText.substring(i + 1, currentPosition).replace("=", "");
	}

	getMethodsOfTheControl(controllerName: string) {
		let classMethods: IUIMethod[] = [];

		if (controllerName) {
			classMethods = this._getClassMethodsRecursively(controllerName);
		}

		return classMethods;
	}

	private _getClassMethodsRecursively(className: string, onlyCustomMethods = true) {
		let methods: IUIMethod[] = [];
		const UIClass = this._parser.classFactory.getUIClass(className);
		methods = UIClass.methods;

		const isThisClassFromAProject = !!this._parser.fileReader.getManifestForClass(
			UIClass.parentClassNameDotNotation
		);
		if (UIClass.parentClassNameDotNotation && (!onlyCustomMethods || isThisClassFromAProject)) {
			methods = methods.concat(this._getClassMethodsRecursively(UIClass.parentClassNameDotNotation));
		}

		return methods;
	}

	getPrefixForLibraryName(libraryName: string, document: string) {
		let prefix: string | undefined;
		const regExp = new RegExp(`(?<=xmlns)(\\w|:)*?(?=="${escapeRegExp(libraryName)}")`);
		const result = regExp.exec(document);
		if (result) {
			prefix = result[0].replace(":", "");
		}

		return prefix;
	}

	public getTagHierarchy(XMLFile: IXMLFile) {
		const tags = this.getAllTags(XMLFile).filter(tag => !tag.text.startsWith("<!--"));
		const tagHierarchy: IHierarchicalTag[] = [];

		let tag = tags.shift();
		while (tag) {
			const hierarchicalTag = { ...tag, tags: [] };
			tagHierarchy.push(hierarchicalTag);

			this._fillSubTags(tags, hierarchicalTag);
			tag = tags.shift();
		}

		return tagHierarchy;
	}

	private _fillSubTags(tags: ITag[], hierarchicalTag: IHierarchicalTag) {
		let tag = tags.shift();

		while (tag) {
			if (!tag.text.startsWith("</")) {
				//<asd> <asd/>
				const hierarchicalSubTag: IHierarchicalTag = { ...tag, tags: [] };
				hierarchicalTag.tags.push(hierarchicalSubTag);
				if (!tag.text.endsWith("/>")) {
					// <asd>
					this._fillSubTags(tags, hierarchicalSubTag);
				}
			} else {
				//</asd>
				break;
			}
			tag = tags.shift();
		}
	}

	public getAllTags(XMLFile: IXMLFile) {
		const XMLText = XMLFile.content;
		if (XMLFile.XMLParserData && XMLFile.XMLParserData.tags.length > 0) {
			return XMLFile.XMLParserData?.tags;
		} else if (XMLFile.XMLParserData && !XMLFile.XMLParserData.areAllStringsClosed) {
			return [];
		}

		let i = 0;
		const tags: ITag[] = [];

		while (i < XMLText.length) {
			const thisIsTagEnd =
				XMLText[i] === ">" &&
				!this.getIfPositionIsInString(XMLFile, i) &&
				this.getIfPositionIsNotInComments(XMLFile, i + 1);
			if (thisIsTagEnd) {
				const indexOfTagBegining = this._getTagBeginingIndex(XMLFile, i);
                const tagText = XMLText.substring(indexOfTagBegining, i + 1);
                if (!tagText.startsWith("<!") || tagText.startsWith("<!--")) {
                    tags.push({
                        text: tagText,
                        positionBegin: indexOfTagBegining,
                        positionEnd: i
                    });
                }
			}
			i++;
		}

		if (!XMLFile.XMLParserData) {
			this.fillXMLParsedData(XMLFile);
		}
		if (XMLFile.XMLParserData) {
			XMLFile.XMLParserData.tags = tags;
		}

		return tags;
	}

	fillXMLParsedData(XMLFile: IXMLFile) {
		XMLFile.XMLParserData = {
			areAllStringsClosed: false,
			prefixResults: {},
			tags: [],
			strings: [],
			comments: undefined
		};
		const stringData = this._getStringPositionMapping(XMLFile);
		XMLFile.XMLParserData.strings = stringData.positionMapping;
		XMLFile.XMLParserData.areAllStringsClosed = stringData.areAllStringsClosed;
	}

	private _getStringPositionMapping(document: IXMLFile) {
		const positionMapping: boolean[] = [];
		let quotionMarkCount = 0;
		let secondTypeQuotionMarkCount = 0;
        let stringOpener: string | null = null;

		let i = 0;
		while (i < document.content.length) {
			const isInString = quotionMarkCount % 2 === 1 || secondTypeQuotionMarkCount % 2 === 1;
			positionMapping.push(isInString);
			if (document.content[i] === "\"" && this.getIfPositionIsNotInComments(document, i) && (!isInString || stringOpener === "\"")) {
				quotionMarkCount++;
                stringOpener = "\"";
			}
			if (document.content[i] === "'" && this.getIfPositionIsNotInComments(document, i) && (!isInString || stringOpener === "'")) {
				secondTypeQuotionMarkCount++;
                stringOpener = "'";
			}
			i++;
		}

		return {
			positionMapping: positionMapping,
			areAllStringsClosed: quotionMarkCount % 2 === 0 && secondTypeQuotionMarkCount % 2 === 0
		};
	}

	private _getTagBeginingIndex(XMLFile: IXMLFile, position: number) {
		let i = position;
		const XMLText = XMLFile.content;

		while (
			i > 0 &&
			(XMLText[i] !== "<" ||
				this.getIfPositionIsInString(XMLFile, i) ||
				!this.getIfPositionIsNotInComments(XMLFile, i - 1))
		) {
			i--;
		}

		return i;
	}

	public getAttributesOfTheTag(tag: ITag | string) {
		const tagOfTagInterface = tag as ITag;
		const tagAsString = tag as string;

		let text = "";
		if (tagOfTagInterface.text) {
			if (tagOfTagInterface.attributes) {
				return tagOfTagInterface.attributes;
			} else {
				text = tagOfTagInterface.text;
			}
		} else {
			text = tagAsString;
		}

		const tags = text.match(/(?<=\s)(\w|:)*(\s?)=(\s?)"(\s|.)*?"/g);

		if (tags && tagOfTagInterface.text && !tagOfTagInterface.attributes) {
			tagOfTagInterface.attributes = tags;
		}

		return tags;
	}
	public getAttributeNameAndValue(attribute: string) {
		const indexOfEqualSign = attribute.indexOf("=");
		const attributeName = attribute.substring(0, indexOfEqualSign).trim();
		let attributeValue = attribute.replace(attributeName, "").replace("=", "").trim();
		attributeValue = attributeValue.substring(1, attributeValue.length - 1); // removes ""

		return {
			attributeName: attributeName,
			attributeValue: attributeValue
		};
	}

	public getPositionsOfFunctionCallInXMLText(functionCallName: string, XMLText: string) {
		const positions: number[] = [];

		const regExpString = `\\.?${functionCallName}("|'|\\(|\\.)`;
		const regex = new RegExp(regExpString, "g");
		let result = regex.exec(XMLText);
		while (result) {
			positions.push(result.index);
			result = regex.exec(XMLText);
		}

		return positions;
	}

	public getEventHandlerNameFromAttributeValue(attributeValue: string) {
		let eventHandlerName = attributeValue;

		if (eventHandlerName.startsWith(".")) {
			eventHandlerName = eventHandlerName.replace(".", "");
		}
		if (eventHandlerName.includes("(")) {
			const result = /.*?(?=\((.|\n)*\))/.exec(eventHandlerName);
			if (result) {
				eventHandlerName = result[0];
			}
		}

		if (!eventHandlerName && attributeValue.startsWith("{") && attributeValue.endsWith("}")) {
			eventHandlerName = attributeValue;
		}

		return eventHandlerName || "";
	}
}
