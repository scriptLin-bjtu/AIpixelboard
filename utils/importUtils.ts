import { Frame, Size } from '../types';
import { rgbaToHex } from './pixelUtils';

export const importSpriteSheet = (
    imageSrc: string, 
    frameSize: Size
): Promise<Frame[]> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const frames: Frame[] = [];
            
            // Check if image is smaller than the frame size
            const isSmallImage = img.width < frameSize.width || img.height < frameSize.height;

            // If small, we treat it as 1 frame. If large, we calculate grid.
            const cols = isSmallImage ? 1 : Math.floor(img.width / frameSize.width);
            const rows = isSmallImage ? 1 : Math.floor(img.height / frameSize.height);
            
            if (cols === 0 || rows === 0) {
                // This shouldn't be reached with the isSmallImage check, but serves as a safety fallback
                reject(new Error("Image dimensions are invalid for the current frame size"));
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = frameSize.width;
            canvas.height = frameSize.height;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                reject(new Error("Could not create canvas context"));
                return;
            }

            // Iterate through the grid of the sprite sheet
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    // Clear canvas for next frame
                    ctx.clearRect(0, 0, frameSize.width, frameSize.height);
                    
                    if (isSmallImage) {
                        // Center the small image in the frame
                        const drawX = Math.floor((frameSize.width - img.width) / 2);
                        const drawY = Math.floor((frameSize.height - img.height) / 2);
                        ctx.drawImage(img, drawX, drawY);
                    } else {
                        // Draw the slice of the image onto the canvas
                        ctx.drawImage(img, 
                            x * frameSize.width, y * frameSize.height, frameSize.width, frameSize.height, // Source
                            0, 0, frameSize.width, frameSize.height // Destination
                        );
                    }
                    
                    const imageData = ctx.getImageData(0, 0, frameSize.width, frameSize.height).data;
                    const pixels: string[] = [];
                    
                    // Convert pixel data to our hex format
                    for (let i = 0; i < imageData.length; i += 4) {
                        const r = imageData[i];
                        const g = imageData[i+1];
                        const b = imageData[i+2];
                        const a = imageData[i+3];
                        
                        if (a < 128) {
                            pixels.push('transparent');
                        } else {
                            pixels.push(rgbaToHex(r, g, b));
                        }
                    }
                    
                    frames.push({
                        id: `frame-${Date.now()}-${frames.length}`,
                        pixels
                    });
                }
            }
            resolve(frames);
        };
        img.onerror = (e) => reject(e);
        img.src = imageSrc;
    });
};