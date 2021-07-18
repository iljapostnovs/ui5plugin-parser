import { UI5Plugin } from "./UI5Plugin";

async function Initialize() {
	const UI5PluginInstance = UI5Plugin.getInstance();
	await UI5PluginInstance.initialize();
	const masterController = UI5PluginInstance.classFactory.getUIClass("com.test.renametest.controller.Master");
	debugger;
}

Initialize();