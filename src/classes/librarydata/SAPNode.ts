import { UI5Metadata } from "./UI5Metadata";
import { UI5MetadataDAO } from "./UI5MetadataDAO";
export class SAPNode {
	node: any;
	metadata: UI5Metadata | undefined;
	nodes: SAPNode[] = [];

	readonly metadataDAO: UI5MetadataDAO;
	constructor(node: any, metadataDAO: UI5MetadataDAO) {
		this.node = node;
		this.metadataDAO = metadataDAO;

		this._fillNodes();
	}

	private _fillNodes() {
		if (this.node.nodes) {
			for (const node of this.node.nodes) {
				const newNode = new SAPNode(node, this.metadataDAO);
				this.nodes.push(newNode);
			}
		}
	}

	getName(): string {
		return this.node.name.replace("module:", "").replace(/\//g, ".");
	}

	getLib() {
		return this.node.lib;
	}

	getKind() {
		return this.node.kind;
	}

	getDisplayName() {
		return this.node.displayName || this.node.name.split(".")[this.node.name.split(".").length - 1];
	}

	getIsDeprecated() {
		return this.node.bIsDeprecated || this.node.deprecated;
	}

	getFields() {
		const metadata = this.getMetadata();
		const rawMetadata = metadata?.getRawMetadata();
		const fields =
			rawMetadata?.properties?.filter(
				(field: any) => field.visibility === "public" || field.visibility === "protected"
			) || [];
		fields.forEach((field: any) => {
			field.name = field.name.replace(rawMetadata?.name + "." || "", "");
		});

		const nodes = this.node.nodes;
		if (nodes) {
			const nodeFields = nodes.map((node: any) => {
				const field = { ...node };
				field.type = node.name || "string";
				field.name = node.name.replace(`${this.node.type || this.node.name}.`, "");
				field.description = node.description || "";
				field.deprecated = node.deprecated || node.bIsDeprecated || false;
				return field;
			});
			fields.push(...nodeFields);
		}

		return fields;
	}

	getProperties(): any[] {
		const metadata = this.getMetadata();
		const properties: any[] = [];
		const nodeProperties = metadata
			?.getUI5Metadata()
			?.properties?.filter(
				(property: any) =>
					!property.deprecatedText &&
					(property.visibility === "public" || property.visibility === "protected")
			);
		if (nodeProperties) {
			properties.push(...nodeProperties);
		}
		return properties;
	}

	getAggregations(): any[] {
		const metadata = this.getMetadata();
		const UI5Metadata: any = metadata?.getUI5Metadata();
		return (
			UI5Metadata?.aggregations?.filter(
				(aggregation: any) =>
					!aggregation.deprecated &&
					(aggregation.visibility === "public" || aggregation.visibility === "protected")
			) || []
		);
	}

	getSpecialSettings(): any[] {
		const metadata = this.getMetadata();
		const UI5Metadata: any = metadata?.getUI5Metadata();
		return (
			UI5Metadata?.specialSettings?.filter(
				(specialSetting: any) =>
					!specialSetting.deprecated &&
					(specialSetting.visibility === "public" || specialSetting.visibility === "protected")
			) || []
		);
	}

	getEvents(): any[] {
		const metadata = this.getMetadata();
		const UI5Metadata: any = metadata?.getRawMetadata();
		return UI5Metadata?.events?.filter((event: any) => !event.deprecated && event.visibility === "public") || [];
	}

	getAssociations(): any[] {
		const metadata = this.getMetadata();
		const UI5Metadata: any = metadata?.getUI5Metadata();
		return (
			UI5Metadata?.associations?.filter(
				(association: any) => !association.deprecated && association.visibility === "public"
			) || []
		);
	}

	getMethods(): any[] {
		const metadata = this.getMetadata();
		const rawMetadata: any = metadata?.getRawMetadata();
		return rawMetadata?.methods?.filter((method: any) => ["public", "protected"].includes(method.visibility)) || [];
	}

	getMetadata() {
		if (!this.metadata) {
			this.metadata = this.metadataDAO.getPreloadedMetadataForNode(this);
		}

		return this.metadata;
	}
}
