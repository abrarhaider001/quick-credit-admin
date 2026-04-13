/** Raw file size cap before base64 (~4/3 expansion stays under Firestore 1 MiB doc limit). */
export const MAX_LOAN_IMAGE_BYTES = 450 * 1024

/**
 * @param {File} file
 * @returns {Promise<string>} data URL (`data:image/...;base64,...`)
 */
export function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Choose an image file (JPEG, PNG, WebP, or GIF).'))
      return
    }
    if (file.size > MAX_LOAN_IMAGE_BYTES) {
      reject(
        new Error(
          `Image is too large (max ${Math.round(MAX_LOAN_IMAGE_BYTES / 1024)} KB). Use a smaller or compressed file.`,
        ),
      )
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Could not read image.'))
        return
      }
      resolve(result)
    }
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsDataURL(file)
  })
}
