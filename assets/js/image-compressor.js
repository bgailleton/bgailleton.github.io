(() => {
  'use strict';

  const formatSize = (bytes) => bytes < 1000 ? `${bytes} bytes`
    : bytes < 1000000 ? `${(bytes / 1000).toFixed(1)} KB`
      : `${(bytes / 1000000).toFixed(2)} MB`;

  const encode = (canvas, quality) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob && blob.type === 'image/jpeg') resolve(blob);
      else reject(new Error('Your browser could not create a JPG. Try a smaller image.'));
    }, 'image/jpeg', quality);
  });

  // JPGs are already compressed. Store them in a ZIP without recompressing.
  // Standard ZIP headers and CRC-32 keep the download dependency-free.
  const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
    for (let i = 0; i < 8; i++) n = (n >>> 1) ^ ((n & 1) ? 0xedb88320 : 0);
    return n >>> 0;
  });
  async function makeZip(entries) {
    if (entries.length > 65535) throw new Error('Too many files for one ZIP. Split the batch.');
    const parts = [];
    const directory = [];
    let offset = 0;
    let directorySize = 0;
    const header = (length) => new DataView(new ArrayBuffer(length));
    for (const { name, blob } of entries) {
      const filename = new TextEncoder().encode(name);
      if (filename.length > 65535 || offset + blob.size + filename.length + 30 >= 0xffffffff) {
        throw new Error('This batch is too large for one ZIP. Split it into smaller batches.');
      }
      const data = new Uint8Array(await blob.arrayBuffer());
      let crc = 0xffffffff;
      for (const byte of data) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
      crc = (crc ^ 0xffffffff) >>> 0;
      const local = header(30);
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true); // UTF-8 names
      local.setUint16(12, 33, true); // 1980-01-01
      local.setUint32(14, crc, true);
      local.setUint32(18, blob.size, true);
      local.setUint32(22, blob.size, true);
      local.setUint16(26, filename.length, true);
      parts.push(local.buffer, filename, blob);
      const central = header(46);
      central.setUint32(0, 0x02014b50, true);
      central.setUint16(4, 20, true);
      central.setUint16(6, 20, true);
      central.setUint16(8, 0x0800, true);
      central.setUint16(14, 33, true);
      central.setUint32(16, crc, true);
      central.setUint32(20, blob.size, true);
      central.setUint32(24, blob.size, true);
      central.setUint16(28, filename.length, true);
      central.setUint32(42, offset, true);
      directory.push(central.buffer, filename);
      directorySize += 46 + filename.length;
      offset += 30 + filename.length + blob.size;
    }
    if (offset + directorySize + 22 >= 0xffffffff) throw new Error('ZIP is too large. Split the batch.');
    const end = header(22);
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, entries.length, true);
    end.setUint16(10, entries.length, true);
    end.setUint32(12, directorySize, true);
    end.setUint32(16, offset, true);
    return new Blob([...parts, ...directory, end.buffer], { type: 'application/zip' });
  }

  const outputName = (filename) => `${filename.replace(/\.[^.]+$/, '').replace(/[\\/\x00-\x1f]/g, '_') || 'image'}-compressed.jpg`;

  // Find the highest fitting quality at each resolution. If even the lowest
  // quality is too large, reduce dimensions and try again.
  async function compress(image, maxBytes, options) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is unavailable in this browser.');
    const scale = Math.min(1, options.maxWidth / image.naturalWidth, options.maxHeight / image.naturalHeight,
      8192 / image.naturalWidth, 8192 / image.naturalHeight,
      Math.sqrt(24000000 / (image.naturalWidth * image.naturalHeight)));
    let width = Math.max(1, Math.floor(image.naturalWidth * scale));
    let height = Math.max(1, Math.floor(image.naturalHeight * scale));

    try {
      while (true) {
        canvas.width = width;
        canvas.height = height;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        let quality = options.maxQuality;
        let blob = await encode(canvas, quality);
        if (blob.size <= maxBytes) return { blob, width, height, quality };

        let low = options.minQuality;
        let high = options.maxQuality;
        const smallest = low === high ? blob : await encode(canvas, low);
        if (smallest.size <= maxBytes) {
          blob = smallest;
          quality = low;
          for (let i = 0; i < 8 && high - low > 0.0001; i++) {
            const middle = (low + high) / 2;
            const candidate = await encode(canvas, middle);
            if (candidate.size <= maxBytes) {
              low = middle;
              blob = candidate;
              quality = middle;
            } else high = middle;
          }
          return { blob, width, height, quality };
        }
        if (!options.allowResize) {
          throw new Error('The file size limit cannot be met at these dimensions and quality settings. Increase the file size limit, lower the minimum quality, or allow further resizing.');
        }
        if (width === 1 && height === 1) {
          throw new Error('This limit is too small for a JPG file. Increase the maximum file size.');
        }
        const ratio = Math.min(0.8, Math.sqrt(maxBytes / smallest.size) * 0.9);
        width = Math.max(1, Math.floor(width * ratio));
        height = Math.max(1, Math.floor(height * ratio));
      }
    } finally {
      // Release the backing buffer, including on encoding failures.
      canvas.width = canvas.height = 1;
    }
  }

  document.querySelectorAll('[data-image-compressor]').forEach((root) => {
    const get = (selector) => root.querySelector(selector);
    const form = get('form');
    const input = get('[data-image-input]');
    const button = get('[data-compress]');
    const status = get('[data-status]');
    const original = get('[data-original-preview]');
    const preview = get('[data-result-preview]');
    const download = get('[data-download]');
    let sourceURL;
    let resultURL;
    let source;
    let sourceFile;
    let revision = 0;
    let selectedFiles = [];
    let zipURL;

    function say(message, error = false) {
      status.textContent = message;
      status.dataset.error = String(error);
    }

    function clearResult() {
      get('[data-zip-download]').hidden = true;
      get('[data-zip-download]').removeAttribute('href');
      if (zipURL) URL.revokeObjectURL(zipURL);
      zipURL = undefined;
      get('[data-batch-list]').querySelectorAll('span').forEach((row) => {
        row.textContent = 'Pending';
        row.dataset.error = 'false';
      });
      get('[data-result]').hidden = true;
      preview.removeAttribute('src');
      download.removeAttribute('href');
      if (resultURL) URL.revokeObjectURL(resultURL);
      resultURL = undefined;
    }

    input.addEventListener('change', async () => {
      const current = ++revision;
      selectedFiles = [...input.files];
      source = undefined;
      sourceFile = undefined;
      button.disabled = true;
      clearResult();
      get('[data-original]').hidden = true;
      original.removeAttribute('src');
      if (sourceURL) URL.revokeObjectURL(sourceURL);
      sourceURL = undefined;
      const batch = selectedFiles.length > 1;
      get('[data-batch]').hidden = !batch;
      get('[data-batch-list]').replaceChildren();
      button.textContent = batch ? 'Compress batch to ZIP' : 'Compress to JPG';
      if (batch) {
        for (const file of selectedFiles) {
          const row = document.createElement('li');
          row.append(document.createTextNode(file.name));
          const detail = document.createElement('span');
          detail.textContent = 'Pending';
          row.append(detail);
          get('[data-batch-list]').append(row);
        }
        button.disabled = false;
        say(`${selectedFiles.length} images selected. Settings apply to each image individually.`);
        return;
      }
      const file = input.files[0];
      if (!file) { say('Choose an image to get started.'); return; }
      say('Opening image locally…');
      const url = URL.createObjectURL(file);
      sourceURL = url;
      const image = new Image();
      image.src = url;
      try {
        await image.decode();
        if (current !== revision) return;
        if (!image.naturalWidth || !image.naturalHeight) throw new Error('No image dimensions');
        source = image;
        sourceFile = file;
        original.src = url;
        get('[data-original-info]').textContent = `${file.name} · ${formatSize(file.size)} · ${image.naturalWidth} × ${image.naturalHeight} px`;
        get('[data-original]').hidden = false;
        button.disabled = false;
        say('Ready. Set a maximum file size and compress.');
      } catch {
        if (current !== revision) return;
        URL.revokeObjectURL(url);
        sourceURL = undefined;
        say('This image could not be opened. The file may be damaged or its format may not be supported by your browser. Try exporting it as PNG, JPG, or WebP first.', true);
      }
    });

    form.addEventListener('input', (event) => {
      if (event.target === input || (!source && selectedFiles.length < 2)) return;
      clearResult();
      say('Settings changed. Compress again to apply your constraints.');
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if ((!source && selectedFiles.length < 2) || !form.reportValidity()) return;
      const maxBytes = Math.floor(Number(get('[data-max-size]').value) * Number(get('[data-size-unit]').value));
      if (!Number.isFinite(maxBytes) || maxBytes < 1) {
        say('Enter a positive maximum file size.', true);
        return;
      }
      const dimension = (selector) => get(selector).value === '' ? Infinity : Number(get(selector).value);
      const options = {
        maxWidth: dimension('[data-max-width]'),
        maxHeight: dimension('[data-max-height]'),
        minQuality: Number(get('[data-min-quality]').value) / 100,
        maxQuality: Number(get('[data-max-quality]').value) / 100,
        allowResize: get('[data-allow-resize]').checked,
      };
      if (options.minQuality > options.maxQuality) {
        say('Minimum quality must be less than or equal to maximum quality.', true);
        return;
      }
      const current = revision;
      const image = source;
      const file = sourceFile;
      const controls = [...form.elements];
      controls.forEach((control) => { control.disabled = true; });
      clearResult();
      root.setAttribute('aria-busy', 'true');
      say('Compressing locally…');
      try {
        if (selectedFiles.length > 1) {
          const entries = [];
          const usedNames = new Set();
          const rows = get('[data-batch-list]').querySelectorAll('span');
          for (const [index, batchFile] of selectedFiles.entries()) {
            say(`Processing ${index + 1} of ${selectedFiles.length}: ${batchFile.name}`);
            rows[index].textContent = 'Processing…';
            const url = URL.createObjectURL(batchFile);
            const batchImage = new Image();
            try {
              batchImage.src = url;
              try { await batchImage.decode(); } catch {
                throw new Error('Cannot open this image. Its format may be unsupported or the file damaged.');
              }
              if (!batchImage.naturalWidth || !batchImage.naturalHeight) throw new Error('No image dimensions.');
              const result = await compress(batchImage, maxBytes, options);
              const baseName = outputName(batchFile.name);
              let name = baseName;
              let suffix = 2;
              while (usedNames.has(name.toLowerCase())) name = baseName.replace(/\.jpg$/, `-${suffix++}.jpg`);
              usedNames.add(name.toLowerCase());
              entries.push({ name, blob: result.blob });
              rows[index].textContent = `${name} · ${formatSize(result.blob.size)} · ${result.width} × ${result.height} px · quality ${Math.round(result.quality * 100)}%`;
            } catch (error) {
              rows[index].textContent = `Skipped: ${error.message || 'Could not process this image.'}`;
              rows[index].dataset.error = 'true';
            } finally {
              URL.revokeObjectURL(url);
              batchImage.removeAttribute('src');
            }
          }
          const skipped = selectedFiles.length - entries.length;
          if (!entries.length) {
            say('No images could be processed. Check the errors below and adjust your settings.', true);
            return;
          }
          say('Preparing ZIP locally…');
          const zip = await makeZip(entries);
          zipURL = URL.createObjectURL(zip);
          const zipDownload = get('[data-zip-download]');
          zipDownload.href = zipURL;
          zipDownload.textContent = `Download ZIP (${formatSize(zip.size)})`;
          zipDownload.hidden = false;
          say(`${entries.length} of ${selectedFiles.length} images ready in your ZIP.${skipped ? ` ${skipped} skipped; see the errors below.` : ''}`);
          return;
        }
        const result = await compress(image, maxBytes, options);
        if (current !== revision) return;
        resultURL = URL.createObjectURL(result.blob);
        preview.src = resultURL;
        download.href = resultURL;
        download.download = outputName(file.name);
        get('[data-result-info]').textContent = `${formatSize(result.blob.size)} (${result.blob.size.toLocaleString()} bytes) · ${result.width} × ${result.height} px · quality ${Math.round(result.quality * 100)}%`;
        get('[data-result]').hidden = false;
        const resized = result.width !== image.naturalWidth || result.height !== image.naturalHeight;
        say(`Ready to download. JPG is within your ${formatSize(maxBytes)} limit.${resized ? ' Dimensions were reduced to meet your constraints or browser limits.' : ''}`);
      } catch (error) {
        say(error.message || 'Could not compress this image. Try a smaller source image.', true);
      } finally {
        controls.forEach((control) => { control.disabled = false; });
        button.disabled = !source && selectedFiles.length < 2;
        root.removeAttribute('aria-busy');
      }
    });

    window.addEventListener('pagehide', () => {
      if (sourceURL) URL.revokeObjectURL(sourceURL);
      if (resultURL) URL.revokeObjectURL(resultURL);
      if (zipURL) URL.revokeObjectURL(zipURL);
    });
  });
})();
