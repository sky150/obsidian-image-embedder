import { App, TFile } from 'obsidian';
import { downloadAndSaveImage, generateUserFriendlyFilename } from '../main';

// Mock the fetch function
global.fetch = jest.fn();

// Mock the App and TFile classes
const mockApp = {
    vault: {
        getAbstractFileByPath: jest.fn(),
        createFolder: jest.fn(),
        createBinary: jest.fn(),
        config: {
            attachmentFolderPath: 'attachments'
        }
    }
} as unknown as App;

const mockTFile = {
    path: 'test/path',
    name: 'test.jpg'
} as unknown as TFile;

describe('Image Download Functionality', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        
        // Setup default mock implementations
        (mockApp.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(mockTFile);
        (mockApp.vault.createFolder as jest.Mock).mockResolvedValue(undefined);
        (mockApp.vault.createBinary as jest.Mock).mockResolvedValue(undefined);
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
        });
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
            
            await downloadAndSaveImage(mockApp, url, folderPath, defaultSettings);
            
            expect(global.fetch).toHaveBeenCalledWith(url);
            expect(mockApp.vault.createBinary).toHaveBeenCalled();
        });

        it('should create the attachment folder if it does not exist', async () => {
            const url = 'https://example.com/image.jpg';
            const folderPath = 'attachments';
            
            (mockApp.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);
            
            await downloadAndSaveImage(mockApp, url, folderPath, defaultSettings);
            
            expect(mockApp.vault.createFolder).toHaveBeenCalledWith(folderPath);
        });

        it('should throw an error when the download fails', async () => {
            const url = 'https://example.com/image.jpg';
            const folderPath = 'attachments';
            
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: false,
                statusText: 'Not Found'
            });
            
            await expect(downloadAndSaveImage(mockApp, url, folderPath, defaultSettings))
                .rejects
                .toThrow('Failed to download image: Not Found');
        });

        it('should throw an error when saving to vault fails', async () => {
            const url = 'https://example.com/image.jpg';
            const folderPath = 'attachments';
            
            (mockApp.vault.createBinary as jest.Mock).mockRejectedValue(new Error('Save failed'));
            
            await expect(downloadAndSaveImage(mockApp, url, folderPath, defaultSettings))
                .rejects
                .toThrow('Save failed');
        });
    });
}); 