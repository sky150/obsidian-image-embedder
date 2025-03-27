import { App, TFile, Vault } from 'obsidian';
import { downloadAndSaveImage, generateUserFriendlyFilename } from '../main';

// Mock the fetch function
global.fetch = jest.fn();

describe('Image Download', () => {
    let app: App;
    let mockVault: Vault;

    beforeEach(() => {
        // Reset fetch mock before each test
        (global.fetch as jest.Mock).mockReset();
        
        // Setup default successful fetch response
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
        });

        mockVault = {
            getAbstractFileByPath: jest.fn(),
            createFolder: jest.fn(),
            createBinary: jest.fn(),
            config: {
                attachmentFolderPath: 'attachments'
            },
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
            getResourcePath: jest.fn(),
            resolveFileUrl: jest.fn(),
            getAvailablePathForAttachment: jest.fn()
        } as unknown as Vault;

        app = {
            vault: mockVault
        } as unknown as App;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateUserFriendlyFilename', () => {
        const defaultSettings = {
            confirmBeforeEmbed: true,
            showFilePath: false,
            attachmentFolder: 'attachments',
            filenameFormat: '{name}-{timestamp}',
            useTimestamp: true
        };

        it('should generate a filename with timestamp when useTimestamp is true', () => {
            const url = 'https://example.com/image.jpg';
            const filename = generateUserFriendlyFilename(url, defaultSettings);
            
            expect(filename).toMatch(/^image-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.jpg$/);
        });

        it('should generate a filename without timestamp when useTimestamp is false', () => {
            const url = 'https://example.com/image.jpg';
            const filename = generateUserFriendlyFilename(url, { ...defaultSettings, useTimestamp: false });
            
            expect(filename).toBe('image.jpg');
        });

        it('should use custom filename format with placeholders', () => {
            const url = 'https://example.com/my-image.jpg';
            const settings = {
                ...defaultSettings,
                filenameFormat: '{date}-{name}',
                useTimestamp: false
            };
            
            const filename = generateUserFriendlyFilename(url, settings);
            const date = new Date().toISOString().split('T')[0];
            
            expect(filename).toBe(`${date}-my-image.jpg`);
        });

        it('should handle URLs with query parameters', () => {
            const url = 'https://example.com/image.jpg?width=800&height=600';
            const filename = generateUserFriendlyFilename(url, defaultSettings);
            
            expect(filename).toMatch(/^image-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.jpg$/);
        });

        it('should handle URLs with special characters', () => {
            const url = 'https://example.com/my%20image%20with%20spaces.jpg';
            const filename = generateUserFriendlyFilename(url, defaultSettings);
            
            expect(filename).toMatch(/^my-20image-20with-20spaces-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.jpg$/);
        });
    });

    describe('downloadAndSaveImage', () => {
        const defaultSettings = {
            confirmBeforeEmbed: true,
            showFilePath: false,
            attachmentFolder: 'attachments',
            filenameFormat: '{name}-{timestamp}',
            useTimestamp: true
        };

        it('should download and save an image successfully', async () => {
            const url = 'https://example.com/image.jpg';
            const folderPath = 'attachments';
            
            await downloadAndSaveImage(app, url, folderPath, defaultSettings);
            
            expect(global.fetch).toHaveBeenCalledWith(url);
            expect(mockVault.createBinary).toHaveBeenCalled();
        });

        it('should create the attachment folder if it does not exist', async () => {
            const url = 'https://example.com/image.jpg';
            const folderPath = 'attachments';
            
            (mockVault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);
            
            await downloadAndSaveImage(app, url, folderPath, defaultSettings);
            
            expect(mockVault.createFolder).toHaveBeenCalledWith(folderPath);
        });

        it('should throw an error when the download fails', async () => {
            const url = 'https://example.com/image.jpg';
            const folderPath = 'attachments';
            
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                statusText: 'Not Found'
            });
            
            await expect(downloadAndSaveImage(app, url, folderPath, defaultSettings))
                .rejects
                .toThrow('Failed to download image: Not Found');
        });

        it('should throw an error when saving to vault fails', async () => {
            const url = 'https://example.com/image.jpg';
            const folderPath = 'attachments';
            
            (mockVault.createBinary as jest.Mock).mockRejectedValue(new Error('Save failed'));
            
            await expect(downloadAndSaveImage(app, url, folderPath, defaultSettings))
                .rejects
                .toThrow('Save failed');
        });
    });
}); 