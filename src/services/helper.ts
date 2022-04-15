
export async function sleepAsync(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function setTimeoutAsync(callback: () => Promise<void>, milliseconds: number) {
  return new Promise((resolve, reject) => setTimeout(async function () {
    try {
      const result = await callback();
      resolve(result);
    } catch (err) {
      reject(err);
    }
  }, milliseconds));
};
