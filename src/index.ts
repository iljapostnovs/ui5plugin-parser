import { UI5Plugin } from "./UI5Plugin";
const test = UI5Plugin.getInstance();
(async function() {
	await test.initialize();
	const testclass = test.classFactory.getUIClass("com.test.memberrename.RenameTest");
})();
export = UI5Plugin;