import { isImageUrl, getUrlFromClipboard } from '../main';

describe('URL Validation', () => {
	describe('isImageUrl', () => {
		it('should identify valid image URLs', () => {
			const validImageUrls = [
				'https://example.com/image.jpg',
				'https://example.com/image.png',
				'https://example.com/image.gif',
				'https://example.com/image.webp',
				'https://example.com/image.svg',
				'https://example.com/image.bmp',
				'https://example.com/image.tiff'
			];

			validImageUrls.forEach(url => {
				expect(isImageUrl(url)).toBe(true);
			});
		});

		it('should reject non-image URLs', () => {
			const nonImageUrls = [
				'https://example.com/page.html',
				'https://example.com/document.pdf',
				'https://example.com/script.js',
				'https://example.com',
				'not-a-url',
				'http://invalid-url'
			];

			nonImageUrls.forEach(url => {
				expect(isImageUrl(url)).toBe(false);
			});
		});
	});

	describe('getUrlFromClipboard', () => {
		it('should extract valid URLs from clipboard data', () => {
			const mockClipboardData = {
				getData: (format: string) => {
					if (format === 'text/plain') {
						return 'https://example.com/image.jpg';
					}
					return '';
				}
			} as DataTransfer;

			const url = getUrlFromClipboard(mockClipboardData);
			expect(url).toBe('https://example.com/image.jpg');
		});

		it('should return null for invalid clipboard data', () => {
			const mockClipboardData = {
				getData: (format: string) => {
					if (format === 'text/plain') {
						return 'not-a-url';
					}
					return '';
				}
			} as DataTransfer;

			const url = getUrlFromClipboard(mockClipboardData);
			expect(url).toBeNull();
		});

		it('should return null for null clipboard data', () => {
			const url = getUrlFromClipboard(null);
			expect(url).toBeNull();
		});
	});
}); 