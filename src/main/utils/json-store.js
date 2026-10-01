'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { app } = require('electron');

const RENAME_RETRIES = 5;
const RENAME_RETRY_DELAY_MS = 50;

function resolveDataPath(fileName) {
  return path.join(app.getPath('userData'), fileName);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// On Windows, antivirus or indexers can briefly lock the target file.
async function renameWithRetry(from, to) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fs.rename(from, to);
    } catch (error) {
      const isTransient = error.code === 'EPERM' || error.code === 'EBUSY';
      if (!isTransient || attempt >= RENAME_RETRIES) throw error;
      await wait(RENAME_RETRY_DELAY_MS * attempt);
    }
  }
}

/** Writes to a temp file and renames it, so a crash never leaves a half-written file. */
async function writeFileAtomic(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}-${Date.now()}.tmp`;
  try {
    await fs.writeFile(tempPath, data);
    await renameWithRetry(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true });
    throw error;
  }
}

/**
 * JSON file in userData. Writes are serialized through a queue so concurrent
 * read-modify-write operations never overwrite each other.
 */
function createJsonStore(fileName, defaultValue) {
  let queue = Promise.resolve();

  function enqueue(task) {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  }

  async function read() {
    const filePath = resolveDataPath(fileName);
    try {
      return JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return structuredClone(defaultValue);
      if (error instanceof SyntaxError) {
        // Keep the damaged file for manual recovery and start fresh.
        await fs.rename(filePath, `${filePath}.corrupt-${Date.now()}`).catch(() => {});
        return structuredClone(defaultValue);
      }
      throw error;
    }
  }

  function write(data) {
    return enqueue(() => writeFileAtomic(resolveDataPath(fileName), JSON.stringify(data, null, 2)));
  }

  /** mutator(current) returns the next value; throwing inside it aborts the write. */
  function update(mutator) {
    return enqueue(async () => {
      const next = await mutator(await read());
      await writeFileAtomic(resolveDataPath(fileName), JSON.stringify(next, null, 2));
      return next;
    });
  }

  return { read, write, update };
}

module.exports = { createJsonStore, writeFileAtomic, resolveDataPath };
