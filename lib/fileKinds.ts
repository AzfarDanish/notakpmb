export type FileKind = 'docx' | 'code' | 'excel' | 'csv' | 'image' | 'native';

const CODE_EXTENSIONS = new Set([
  'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'h', 'cpp', 'hpp', 'cc',
  'cs', 'rb', 'go', 'rs', 'php', 'swift', 'kt', 'html', 'css', 'scss',
  'sql', 'json', 'xml', 'yaml', 'yml', 'sh', 'bash', 'zsh', 'bat', 'ps1',
  'r', 'm', 'ipynb', 'toml', 'ini', 'dockerfile', 'vue', 'svelte',
]);

const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif',
]);

export function getFileKind(name: string): FileKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'docx') return 'docx';
  if (ext === 'xlsx' || ext === 'xls') return 'excel';
  if (ext === 'csv') return 'csv';
  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (CODE_EXTENSIONS.has(ext)) return 'code';
  return 'native';
}
