/**
 * Trình tạo file .docx (OOXML) thuần trình duyệt - không cần thư viện ngoài.
 * Đóng gói ZIP theo phương thức STORE (không nén) - Word/LibreOffice đều mở được.
 */

// ---------------------------------------------------------------- ZIP (store)

let crcTable: Uint32Array | null = null;
const getCrcTable = () => {
    if (crcTable) return crcTable;
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[i] = c >>> 0;
    }
    crcTable = table;
    return table;
};

const crc32 = (data: Uint8Array) => {
    const table = getCrcTable();
    let c = 0xffffffff;
    for (let i = 0; i < data.length; i++) c = table[(c ^ data[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
};

export interface ZipEntry {
    name: string;
    data: Uint8Array;
}

/** Ghép các entry thành một Blob ZIP (stored, không nén). */
export const zipStore = (entries: ZipEntry[]): Blob => {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const central: Uint8Array[] = [];
    let offset = 0;

    const u16 = (v: number) => [v & 0xff, (v >>> 8) & 0xff];
    const u32 = (v: number) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];

    for (const entry of entries) {
        const nameBytes = encoder.encode(entry.name);
        const crc = crc32(entry.data);
        const size = entry.data.length;

        const local = new Uint8Array([
            0x50, 0x4b, 0x03, 0x04,
            ...u16(20), ...u16(0x0800), ...u16(0), // version, flags (UTF-8), method = store
            ...u16(0), ...u16(0),                  // time, date
            ...u32(crc), ...u32(size), ...u32(size),
            ...u16(nameBytes.length), ...u16(0),
            ...nameBytes,
        ]);

        chunks.push(local, entry.data);

        central.push(new Uint8Array([
            0x50, 0x4b, 0x01, 0x02,
            ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0),
            ...u16(0), ...u16(0),
            ...u32(crc), ...u32(size), ...u32(size),
            ...u16(nameBytes.length), ...u16(0), ...u16(0),
            ...u16(0), ...u16(0), ...u32(0),
            ...u32(offset),
            ...nameBytes,
        ]));

        offset += local.length + size;
    }

    const centralSize = central.reduce((sum, c) => sum + c.length, 0);
    const end = new Uint8Array([
        0x50, 0x4b, 0x05, 0x06,
        ...u16(0), ...u16(0),
        ...u16(central.length), ...u16(central.length),
        ...u32(centralSize), ...u32(offset),
        ...u16(0),
    ]);

    return new Blob([...chunks, ...central, end] as BlobPart[], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
};

// ------------------------------------------------------------------- Helpers

export const escapeXml = (value: unknown): string =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

export interface DocxImage {
    /** Tên file trong word/media, ví dụ "photo.png" */
    fileName: string;
    /** Phần mở rộng dùng để khai báo Content-Type: png | jpeg */
    extension: 'png' | 'jpeg' | 'gif';
    data: Uint8Array;
    /** Relationship id dùng trong document.xml, ví dụ "rId10" */
    relId: string;
}

export interface BuildDocxOptions {
    /** Nội dung nằm trong <w:body>, đã bao gồm <w:sectPr> ở cuối */
    body: string;
    images?: DocxImage[];
    /** Cỡ chữ mặc định tính bằng nửa-point (25 = 12,5pt) */
    defaultHalfPointSize?: number;
    defaultFont?: string;
}

const CONTENT_TYPES = (exts: string[]) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
${exts.map(e => `<Default Extension="${e}" ContentType="image/${e === 'jpg' ? 'jpeg' : e}"/>`).join('')}
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const styles = (font: string, size: number) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>
<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>
<w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:lang w:val="vi-VN"/>
</w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/>
<w:tblPr><w:tblCellMar><w:top w:w="20" w:type="dxa"/><w:left w:w="60" w:type="dxa"/><w:bottom w:w="20" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr>
</w:style>
</w:styles>`;

/** Dựng Blob .docx hoàn chỉnh từ phần thân WordprocessingML. */
export const buildDocx = ({
    body,
    images = [],
    defaultHalfPointSize = 25,
    defaultFont = 'Times New Roman',
}: BuildDocxOptions): Blob => {
    const encoder = new TextEncoder();
    const exts = Array.from(new Set(images.map(i => i.extension)));

    const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
 xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<w:body>${body}</w:body></w:document>`;

    const documentRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
${images.map(i => `<Relationship Id="${i.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${i.fileName}"/>`).join('')}
</Relationships>`;

    const entries: ZipEntry[] = [
        { name: '[Content_Types].xml', data: encoder.encode(CONTENT_TYPES(exts)) },
        { name: '_rels/.rels', data: encoder.encode(ROOT_RELS) },
        { name: 'word/document.xml', data: encoder.encode(document) },
        { name: 'word/styles.xml', data: encoder.encode(styles(defaultFont, defaultHalfPointSize)) },
        { name: 'word/_rels/document.xml.rels', data: encoder.encode(documentRels) },
        ...images.map(i => ({ name: `word/media/${i.fileName}`, data: i.data })),
    ];

    return zipStore(entries);
};

/** Tải Blob về máy với tên file cho trước. */
export const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Tải ảnh từ URL (hoặc data URL) về dạng bytes để nhúng vào docx. */
export const fetchImageBytes = async (
    url: string
): Promise<{ data: Uint8Array; extension: 'png' | 'jpeg' | 'gif' } | null> => {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const buffer = new Uint8Array(await response.arrayBuffer());
        const type = (response.headers.get('content-type') || '').toLowerCase();

        let extension: 'png' | 'jpeg' | 'gif' = 'png';
        if (type.includes('jpeg') || type.includes('jpg')) extension = 'jpeg';
        else if (type.includes('gif')) extension = 'gif';
        else if (!type.includes('png')) {
            // Đoán theo magic number khi server không trả content-type ảnh
            if (buffer[0] === 0xff && buffer[1] === 0xd8) extension = 'jpeg';
            else if (buffer[0] === 0x47 && buffer[1] === 0x49) extension = 'gif';
            else if (!(buffer[0] === 0x89 && buffer[1] === 0x50)) return null;
        }
        return { data: buffer, extension };
    } catch {
        return null;
    }
};
