(function () {
  'use strict';

  const DB_NAME = 'skct-pdf-exam-v1';
  const STORE = 'sources';
  const META = 'meta';

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('이 브라우저는 PC 저장 기능을 지원하지 않습니다.'));
        return;
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: 'id' });
        if (!database.objectStoreNames.contains(META)) database.createObjectStore(META, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('PC 저장소를 열 수 없습니다.'));
    });
  }

  async function requestValue(store, mode, operation) {
    const database = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(store, mode);
        const request = operation(transaction.objectStore(store));
        let result;
        request.onsuccess = () => { result = request.result; };
        request.onerror = () => reject(request.error || new Error('저장 작업에 실패했습니다.'));
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = () => reject(transaction.error || new Error('저장 작업이 취소되었습니다.'));
      });
    } finally {
      database.close();
    }
  }

  function sourceId(file) {
    return [file.name, file.size, file.lastModified || 0].join(':');
  }

  async function saveSource(source) {
    if (!source || !source.file || !Array.isArray(source.sections)) throw new Error('저장할 PDF 분석 결과가 없습니다.');
    const record = {
      id: source.id || sourceId(source.file),
      fileName: source.file.name,
      file: source.file,
      sections: JSON.parse(JSON.stringify(source.sections)),
      issues: JSON.parse(JSON.stringify(source.issues || [])),
      savedAt: Date.now()
    };
    await requestValue(STORE, 'readwrite', store => store.put(record));
    return record.id;
  }

  async function listSources() {
    const records = await requestValue(STORE, 'readonly', store => store.getAll());
    return records.map(({ id, fileName, savedAt, sections }) => ({
      id, fileName, savedAt,
      sectionCount: sections.length,
      questionCount: sections.reduce((total, section) => total + (section.questions || []).length, 0)
    })).sort((a, b) => b.savedAt - a.savedAt);
  }

  function getSource(id) {
    return requestValue(STORE, 'readonly', store => store.get(id));
  }

  function deleteSource(id) {
    return requestValue(STORE, 'readwrite', store => store.delete(id));
  }

  function saveMistakes(items) {
    return requestValue(META, 'readwrite', store => store.put({ id: 'mistakes', items, savedAt: Date.now() }));
  }

  async function getMistakes() {
    const record = await requestValue(META, 'readonly', store => store.get('mistakes'));
    return Array.isArray(record && record.items) ? record.items : [];
  }

  async function fileToBase64(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const chunkSize = 0x8000;
    let binary = '';
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary);
  }

  function base64ToFile(source) {
    const binary = atob(source.data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return new File([bytes], source.fileName, {
      type: 'application/pdf',
      lastModified: source.lastModified || Date.now()
    });
  }

  async function exportBundle(sources) {
    const serializable = [];
    for (const source of sources) {
      serializable.push({
        fileName: source.file.name,
        lastModified: source.file.lastModified,
        data: await fileToBase64(source.file),
        sections: source.sections,
        issues: source.issues || []
      });
    }
    return new Blob([JSON.stringify({ format: 'skct-pdf-exam', version: 1, sources: serializable })], {
      type: 'application/json'
    });
  }

  async function importBundle(file) {
    const bundle = JSON.parse(await file.text());
    if (bundle.format !== 'skct-pdf-exam' || bundle.version !== 1 || !Array.isArray(bundle.sources)) {
      throw new Error('SKCT PDF 시험 저장 파일이 아닙니다.');
    }
    return bundle.sources.map(source => {
      if (!source || typeof source.data !== 'string' || !Array.isArray(source.sections)) {
        throw new Error('저장 파일의 자료가 손상되었습니다.');
      }
      return {
        file: base64ToFile(source),
        sections: source.sections,
        issues: source.issues || []
      };
    });
  }

  window.PdfExamStorage = {
    sourceId, saveSource, listSources, getSource, deleteSource,
    saveMistakes, getMistakes, exportBundle, importBundle
  };
})();
