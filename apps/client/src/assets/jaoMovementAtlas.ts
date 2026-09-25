const PARTS = [
  'assets/jao/movement/part01.b64',
  'assets/jao/movement/part02.b64',
  'assets/jao/movement/part03.b64',
  'assets/jao/movement/part04.b64',
  'assets/jao/movement/part05.b64',
  'assets/jao/movement/part06.b64'
] as const;

let movementAtlasUrl: string | null = null;

export async function prepareJaoMovementAtlas(): Promise<void> {
  if (movementAtlasUrl !== null) return;

  const chunks = await Promise.all(
    PARTS.map(async (path) => {
      const response = await fetch(import.meta.env.BASE_URL + path);
      if (!response.ok) {
        throw new Error(`Falha ao carregar atlas do Jão: ${path} (${response.status})`);
      }
      return response.text();
    })
  );

  const encoded = chunks.join('').replace(/\s+/g, '');
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  movementAtlasUrl = URL.createObjectURL(
    new Blob([bytes], { type: 'image/webp' })
  );
}

export function getJaoMovementAtlasUrl(): string {
  if (movementAtlasUrl === null) {
    throw new Error('Atlas de movimento do Jão ainda não foi preparado.');
  }

  return movementAtlasUrl;
}
