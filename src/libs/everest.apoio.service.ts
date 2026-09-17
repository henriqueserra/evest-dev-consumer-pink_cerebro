import axios, { AxiosRequestConfig } from 'axios';
import _ from 'lodash';
import path from 'path';
import { EverestError } from './everest.error.services';
import { EverestLogService } from './everest.log.services';

const logService = new EverestLogService();
const routeName = 'EverestApoioService';

// Add type definitions
interface JsonDiffResult<T> {
  newToOld: Partial<T>;
  oldToNew: Partial<T>;
  changedValues?: unknown[];
}

export class EverestApoioService {
  constructor() {}

  // Add memoization for expensive operations
  private static readonly memoizedRemoveAcentos = _.memoize((text: string): string => {
    const methodName = `${routeName}.memoizedRemoveAcentos`;
    try {
      return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[Çç]/g, 'C')
        .replace(/[ãÃ]/g, 'a')
        .replace(/[õÕ]/g, 'o');
    } catch (error: any) {
      throw new EverestError(`Failed to remove accents: ${error.message}`);
    }
  });

  // Improved number sanitization
  public static apenasNumeros(texto: string | null | undefined): string {
    if (!texto) return '';
    return texto.replace(/\D/g, '');
  }

  public static getFileFromUrl = async (url: string): Promise<Buffer> => {
    const methodName = `${routeName}.getFileFromUrl`;
    try {
      const axiosParams: AxiosRequestConfig = {
        method: 'GET',
        url,
        responseType: 'arraybuffer',
      };
      const response = await axios.request(axiosParams);

      const buffer = Buffer.from(response.data);

      return buffer;
    } catch (error: any) {
      logService.error({ message: error.message, method: methodName }).then(() => {
        console.error(`getFileFromUrl - ${error.message}`);
      });
      throw new Error(`getFileFromUrl - ${error.message}`);
    }
  };

  public static getFirstAttributeNames(jsonData: any): string[] {
    // Obtém os nomes das chaves do objeto
    const keys = Object.keys(jsonData);

    // Retorna os dois primeiros nomes de chave
    return keys;
  }

  public static getMimeTypeFromExtension = (extension: string): string => {
    // Define a mapping of file extensions to MIME types
    const mimeTypes: { [key: string]: string } = {
      txt: 'text/plain',
      html: 'text/html',
      css: 'text/css',
      csv: 'text/csv',
      json: 'application/json',
      js: 'application/javascript',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      pdf: 'application/pdf',
      // Add more file extensions and their corresponding MIME types as needed
    };

    // Convert the extension to lowercase (file extensions are often case-insensitive)
    const lowerCaseExtension = extension.toLowerCase();

    // Lookup the MIME type for the given extension
    const mimeType = mimeTypes[lowerCaseExtension];

    return mimeType || 'application/octet-stream';
  };

  public static isEqual(value: any, other: any): boolean {
    // Use lodash para comparar objetos
    return _.isEqual(value, other);
  }

  public static isJsonObject(value: any): boolean {
    return _.isObject(value);
  }

  public static jsonDiff<T extends Record<string, any>>({
    oldJson,
    newJson,
  }: {
    oldJson: T;
    newJson: T;
  }): JsonDiffResult<T> {
    try {
      const differencesNewToOld = Object.keys(newJson).reduce<Partial<T>>((result, key) => {
        if (!this.isEqual(newJson[key], oldJson[key])) {
          result[key as keyof T] = newJson[key];
        }
        return result;
      }, {});

      const differencesOldToNew = Object.keys(oldJson).reduce<Partial<T>>((result, key) => {
        if (!this.isEqual(oldJson[key], newJson[key])) {
          result[key as keyof T] = oldJson[key];
        }
        return result;
      }, {});

      return {
        newToOld: differencesNewToOld,
        oldToNew: differencesOldToNew,
      };
    } catch (error: any) {
      throw new EverestError(`Failed to compare JSONs: ${error.message}`);
    }
  }

  public static jsonDiffNew<T extends Record<string, any>>({
    oldJson,
    newJson,
  }: {
    oldJson: T;
    newJson: T;
  }): { newToOld: any[] } {
    try {
      const changedValues: unknown[] = [];
      const differencesNewToOld = Object.keys(newJson).reduce<Partial<T>>((accumulator, key) => {
        if (!this.isEqual(newJson[key], oldJson[key])) {
          accumulator[key as keyof T] = newJson[key];
          changedValues.push(newJson[key]);
        }
        return accumulator;
      }, {});

      return {
        newToOld: changedValues,
      };
    } catch (error: any) {
      throw new EverestError(`Failed to compare JSONs: ${error.message}`);
    }
  }

  public static ordenaArray<T>(array: T[], campo: keyof T): T[] {
    // Use lodash para ordenar o array
    return _.sortBy(array, campo);
  }
  // Use lodash para ordenar o array
  public static sortArray<T>(array: T[], campo: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
    return _.sortBy(array, campo);
  }

  public static saneiaFileName(originalFileName: string): string {
    try {
      const ext = path.extname(originalFileName);
      let fileName = this.memoizedRemoveAcentos(originalFileName)
        .split(ext)[0]
        .trim()
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .replace(/_+/g, '_');

      return `${fileName}${ext}`;
    } catch (error: any) {
      throw new EverestError(`Failed to sanitize filename: ${error.message}`);
    }
  }

  public static saneiaJson<T>(obj: T): T {
    try {
      if (_.isArray(obj)) {
        return (obj as unknown as any[])
          .map((item) => this.saneiaJson(item))
          .filter((item) => !_.isEmpty(item)) as unknown as T;
      }

      if (_.isObject(obj)) {
        return _.omitBy(
          _.mapValues(obj as object, (value) => this.saneiaJson(value)),
          (value) => value === null || value === '' || (_.isObject(value) && _.isEmpty(value))
        ) as T;
      }

      return obj;
    } catch (error: any) {
      throw new EverestError(`Failed to sanitize JSON: ${error.message}`);
    }
  }

  public static sortAlphabetically(arr: string[]): string[] {
    return _.sortBy(arr);
  }

  public static validaDocumento(documento: string): {
    status: boolean;
    documentoOriginal: string;
    documentoFormatado: string;
    type: string;
  } {
    logService.info({ message: `validaDocumento: ${documento}`, method: `${routeName}.validaDocumento` });
    if (documento === '' || !documento || documento === undefined) {
      return {
        status: false,
        documentoOriginal: '',
        documentoFormatado: `${documento}(inválido)`,
        type: '',
      };
    }

    documento = documento.replace(/[^\d]+/g, '') as string;
    // Valida CPF
    if (documento.length == 14) {
      var result = isValidCnpj(documento);
      return {
        status: result,
        documentoOriginal: documento,
        documentoFormatado: result ? cnpj(documento) : `${documento}(inválido)`,
        type: 'CNPJ',
      };
    } else if (documento.length == 11) {
      var result = isValidCpf(documento);
      return {
        status: result,
        documentoOriginal: documento,
        documentoFormatado: result ? cpf(documento) : `${documento}(inválido)`,
        type: 'CPF',
      };
    } else {
      return {
        status: false,
        type: '',
        documentoOriginal: documento,
        documentoFormatado: `${documento}(inválido)`,
      };
    }
  }

  public static validarNumeroProcesso(numeroProcesso: string): boolean {
    const numero = numeroProcesso.replace(/[^\d]/g, '');

    // Valida o tamanho (deve ter 20 dígitos)
    if (numero.length !== 20) {
      return false;
    }

    // Separa o número base (primeiros 7 dígitos + últimos 11 dígitos) do DV (2 dígitos do meio)
    const parte1 = numero.substring(0, 7);
    const dvInformado = numero.substring(7, 9);
    const parte2 = numero.substring(9);

    // Concatena as partes sem o DV
    const numeroBase = parte1 + parte2;

    // Calcula o DV usando o algoritmo Módulo 97, Base 10, ISO 7064
    const numeroParaCalculo = BigInt(numeroBase) * BigInt(100);
    const resto = Number(numeroParaCalculo % BigInt(97));
    const dvCalculado = (98 - resto).toString().padStart(2, '0');

    // Valida o DV calculado com o informado
    return dvCalculado === dvInformado;
  }

  public static formatarNumeroProcesso(numeroProcesso: string): string {
    const numero = numeroProcesso.replace(/[^\d]/g, '');
    return `${numero.substring(0, 7)}-${numero.substring(7, 9)}.${numero.substring(9, 13)}.${numero.substring(
      13,
      14
    )}.${numero.substring(14, 16)}.${numero.substring(16, 20)}`;
  }
}

const isValidCnpj = (documento: string) => {
  var tamanho = documento.length - 2;
  var numeros = documento.substring(0, tamanho);
  var digitos = documento.substring(tamanho);
  var soma = 0;
  var pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  var resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado != parseInt(digitos.charAt(0))) return false;
  tamanho = tamanho + 1;
  numeros = documento.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado != parseInt(digitos.charAt(1))) return false;
  return true;
};

const isValidCpf = (documento: string) => {
  if (typeof documento !== 'string') {
    return false;
  }

  documento = documento.replace(/[^\d]+/g, '');

  if (documento.length !== 11 || !!documento.match(/(\d)\1{10}/)) {
    return false;
  }

  const documentos = documento.split('').map((el) => +el);
  const rest = (count: number) =>
    ((documentos.slice(0, count - 12).reduce((soma, el, index) => soma + el * (count - index), 0) * 10) % 11) % 10;

  return rest(10) === documentos[9] && rest(11) === documentos[10];
};

const cpf = (cpf: string) => {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const cnpj = (cnpj: string) => {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};
