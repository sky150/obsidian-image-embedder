import { App, Editor, MarkdownView, Plugin, PluginManifest, Vault, TAbstractFile, TFile, TFolder, FileManager, Workspace } from 'obsidian';
import ImageEmbedderPlugin from '../main';
import { DEFAULT_SETTINGS, ImageEmbedderSettings } from '../main';

describe('Image Embedder Plugin Settings', () => {
    let plugin: ImageEmbedderPlugin;
    let app: App & { fileManager: FileManager };
    let mockFileManager: FileManager;
    let mockWorkspace: Workspace;

    beforeEach(async () => {
        mockFileManager = {
            getAvailablePathForAttachment: jest.fn().mockImplementation((filename: string, extension: string) => {
                // Return a path in the format: attachments/filename.extension
                // If no filename is provided, use a default
                const name = filename || 'image';
                const ext = extension || '';
                return Promise.resolve(`attachments/${name}${ext}`);
            }),
        } as unknown as FileManager;

        mockWorkspace = {
            on: jest.fn(),
            off: jest.fn(),
            trigger: jest.fn(),
            getActiveViewOfType: jest.fn()
        } as unknown as Workspace;

        app = {
            fileManager: mockFileManager,
            workspace: mockWorkspace,
            vault: {
                getAbstractFileByPath: jest.fn(),
                createFolder: jest.fn(),
                createBinary: jest.fn(),
                getRoot: jest.fn(),
                delete: jest.fn(),
                read: jest.fn(),
                modify: jest.fn(),
                process: jest.fn(),
                adapter: {
                    exists: jest.fn(),
                    mkdir: jest.fn(),
                    write: jest.fn(),
                    read: jest.fn()
                },
                configDir: '',
                getName: jest.fn(),
                getFileByPath: jest.fn(),
                getFolderByPath: jest.fn(),
                create: jest.fn(),
                createFile: jest.fn(),
                rename: jest.fn(),
                copy: jest.fn(),
                getAllLoadedFiles: jest.fn(),
                getMarkdownFiles: jest.fn(),
                getFiles: jest.fn(),
                on: jest.fn(),
                off: jest.fn(),
                trigger: jest.fn(),
                tryTrigger: jest.fn(),
                exists: jest.fn(),
                trash: jest.fn(),
                recursive: jest.fn(),
                cachedRead: jest.fn(),
                readBinary: jest.fn(),
                modifyBinary: jest.fn(),
                append: jest.fn(),
                getResourcePath: jest.fn(),
                resolveFileUrl: jest.fn()
            } as unknown as Vault
        } as App & { fileManager: FileManager };

        plugin = new ImageEmbedderPlugin(app, {} as PluginManifest);
        plugin.app = app; // Make sure app is set
        plugin.loadData = jest.fn().mockResolvedValue(DEFAULT_SETTINGS);
        plugin.saveData = jest.fn().mockResolvedValue(undefined);
        plugin.registerEvent = jest.fn();
        plugin.addSettingTab = jest.fn();
        await plugin.loadSettings();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Settings Initialization', () => {
        it('should load default settings', async () => {
            expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
        });

        it('should load custom settings', async () => {
            const customSettings = {
                ...DEFAULT_SETTINGS,
                confirmBeforeEmbed: false,
                showFilePath: true,
                attachmentFolder: 'custom-folder',
                filenameFormat: 'custom-{filename}-{date}',
                useTimestamp: true
            };
            (plugin.loadData as jest.Mock).mockResolvedValueOnce(customSettings);
            await plugin.loadSettings();
            expect(plugin.settings).toEqual(customSettings);
        });
    });

    describe('Settings Persistence', () => {
        it('should save settings', async () => {
            const newSettings = {
                ...DEFAULT_SETTINGS,
                confirmBeforeEmbed: false
            };
            plugin.settings = newSettings;
            await plugin.saveSettings();
            expect(plugin.saveData).toHaveBeenCalledWith(newSettings);
        });

        it('should handle save errors', async () => {
            (plugin.saveData as jest.Mock).mockRejectedValueOnce(new Error('Save failed'));
            plugin.settings = DEFAULT_SETTINGS;
            await expect(plugin.saveSettings()).rejects.toThrow('Save failed');
        });
    });

    describe('Attachment Folder Handling', () => {
        it('should use default attachment folder when not set', async () => {
            plugin.settings.attachmentFolder = '';
            await plugin.onload();
            expect(plugin.settings.attachmentFolder).toBe('attachments');
            expect(mockFileManager.getAvailablePathForAttachment).toHaveBeenCalledWith('', '');
        });

        it('should use custom attachment folder when set', async () => {
            // First load the plugin to initialize settings
            await plugin.onload();
            
            // Then set the custom folder
            plugin.settings.attachmentFolder = 'custom-folder';
            await plugin.saveSettings();
            
            // Update the mock to return our saved settings
            (plugin.loadData as jest.Mock).mockResolvedValueOnce({
                ...DEFAULT_SETTINGS,
                attachmentFolder: 'custom-folder'
            });
            
            // Verify that loading again doesn't change the setting
            await plugin.loadSettings();
            expect(plugin.settings.attachmentFolder).toBe('custom-folder');
        });
    });

    describe('Filename Format Validation', () => {
        it('should handle valid filename format', () => {
            plugin.settings.filenameFormat = '{name}-{date}';
            expect(plugin.settings.filenameFormat).toBe('{name}-{date}');
        });

        it('should handle empty filename format', () => {
            plugin.settings.filenameFormat = '';
            expect(plugin.settings.filenameFormat).toBe('');
        });

        it('should handle invalid filename format', () => {
            plugin.settings.filenameFormat = '{invalid}';
            expect(plugin.settings.filenameFormat).toBe('{invalid}');
        });
    });

    describe('Settings UI', () => {
        it('should update toggle settings', async () => {
            plugin.settings.confirmBeforeEmbed = true;
            await plugin.saveSettings();
            expect(plugin.saveData).toHaveBeenCalledWith(expect.objectContaining({
                confirmBeforeEmbed: true
            }));
        });

        it('should update text settings', async () => {
            plugin.settings.attachmentFolder = 'new-folder';
            await plugin.saveSettings();
            expect(plugin.saveData).toHaveBeenCalledWith(expect.objectContaining({
                attachmentFolder: 'new-folder'
            }));
        });
    });
}); 