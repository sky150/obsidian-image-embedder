import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, Events } from 'obsidian';

// Remember to rename these classes and interfaces!

interface ImageEmbedderSettings {
	confirmBeforeEmbed: boolean;
	showFilePath: boolean;
	attachmentFolder: string;
}

const DEFAULT_SETTINGS: ImageEmbedderSettings = {
	confirmBeforeEmbed: true,
	showFilePath: false,
	attachmentFolder: 'attachments'
}

export default class ImageEmbedderPlugin extends Plugin {
	settings: ImageEmbedderSettings;

	async onload() {
		await this.loadSettings();

		// Register the paste event handler
		this.registerEvent(
			this.app.workspace.on('editor-paste', (evt: ClipboardEvent, editor: Editor, markdownView: MarkdownView) => {
				// We'll implement this later
				console.log('Paste event detected');
			})
		);

		// Add settings tab
		this.addSettingTab(new ImageEmbedderSettingTab(this.app, this));
	}

	onunload() {
		// Clean up any resources if needed
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class ImageEmbedderSettingTab extends PluginSettingTab {
	plugin: ImageEmbedderPlugin;

	constructor(app: App, plugin: ImageEmbedderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Confirm before embedding')
			.setDesc('Show a confirmation dialog before downloading and embedding images')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.confirmBeforeEmbed)
				.onChange(async (value) => {
					this.plugin.settings.confirmBeforeEmbed = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show file path')
			.setDesc('Show the saved file path in the success notice')
			.addToggle((toggle) => toggle
				.setValue(this.plugin.settings.showFilePath)
				.onChange(async (value) => {
					this.plugin.settings.showFilePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Attachment folder')
			.setDesc('Folder where downloaded images will be saved (relative to vault root)')
			.addText((text) => text
				.setPlaceholder('attachments')
				.setValue(this.plugin.settings.attachmentFolder)
				.onChange(async (value) => {
					this.plugin.settings.attachmentFolder = value;
					await this.plugin.saveSettings();
				}));
	}
}
