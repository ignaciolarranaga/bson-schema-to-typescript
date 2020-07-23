import {
  compile as compileJSON,
  Options as CompileJSONOptions,
} from "json-schema-to-typescript";
import { JsonObject, JsonValue } from "./types";

/**
 * JSON Schema types (type keyword)
 * https://json-schema.org/understanding-json-schema/reference/type.html
 *
 * string
 * number
 * object
 * array
 * boolean
 * null
 *
 * BSON types (bsonType keyword)
 * https://docs.mongodb.com/manual/reference/operator/query/jsonSchema/#available-keywords
 * https://docs.mongodb.com/manual/reference/operator/query/type/#document-type-available-types
 *
 * [X] number
 * [ ] double
 * [X] string
 * [ ] object
 * [ ] array
 * [ ] binData
 * [ ] undefined  -- Deprecated
 * [ ] objectId
 * [X] bool
 * [X] date
 * [X] null
 * [ ] regex
 * [ ] dbPointer  -- Deprecated
 * [ ] javascript
 * [ ] symbol     -- Deprecated
 * [ ] javascriptWithScope
 * [ ] int
 * [ ] timestamp
 * [ ] long
 * [X] decimal
 * [ ] minKey
 * [ ] maxKey
 *
 * BSON types -> TS
 */
const bsonToTs = new Map([
  ["number", "number"],
  // ["double", "Double"],
  ["string", "string"],
  ["bool", "boolean"],
  ["date", "Date"],
  ["null", "null"],
  ["decimal", "Decimal128"],
]);

/**
 * Generate the 'tsType' field for bson types.
 * https://github.com/bcherny/json-schema-to-typescript#custom-schema-properties
 */
function buildTsType(bsonType?: JsonValue): string | null {
  // Handle array of BSON types
  //
  // This is necessary since
  // https://github.com/bcherny/json-schema-to-typescript does not support
  // 'tsType' as an array
  if (Array.isArray(bsonType)) {
    return bsonType.map((e) => buildTsType(e)).join("|");
  }

  if (typeof bsonType !== "string") return null;

  // Return the 'tsType' based on the BSON type
  return bsonToTs.get(bsonType) || null;
}

/**
 * Annotates the Schema objects with 'tsType' properties based on the 'bsonType'
 */
function addTsType(schema: JsonValue): JsonValue {
  if (Array.isArray(schema)) {
    return schema.map(addTsType);
  }

  if (typeof schema === "object" && schema !== null) {
    const bsonType = "bsonType" in schema ? schema.bsonType : undefined;
    const isEnum = Reflect.has(schema, "enum");
    const tsType = buildTsType(bsonType);

    // Add 'tsType' fields to objects, except enums
    const v: JsonValue = !isEnum && tsType ? { ...schema, tsType } : schema;

    return Object.entries(v).reduce<JsonObject>((acc, [key, value]) => {
      return {
        ...acc,
        [key]: addTsType(value),
      };
    }, {});
  }

  return schema;
}

function hasDecimal128(schema: JsonValue): boolean {
  if (schema === null || typeof schema !== "object") {
    return false;
  }

  if (Array.isArray(schema)) {
    return schema.some(hasDecimal128);
  }

  return Object.entries(schema).some(([key, value]) => {
    if (key === "bsonType") {
      if (value === "decimal") return true;
      if (Array.isArray(value)) return value.includes("decimal");
    }

    if (typeof value === "object") return hasDecimal128(value);

    return false;
  });
}

export const DEFAULT_OPTIONS = {
  $refOptions: {},
  bannerComment: [
    "/* eslint-disable */",
    "/* tslint:disable */",
    "/**",
    "* This file was automatically generated by bson-schema-to-typescript.",
    "* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,",
    "* and run bson-schema-to-typescript to regenerate this file.",
    "*/",
  ],
  cwd: process.cwd(),
  declareExternallyReferenced: true,
  enableConstEnums: true,
  ignoreMinAndMaxItems: false,
  strictIndexSignatures: false,
  style: null,
  unreachableDefinitions: false,
  unknownAny: true,
};

export async function compileBSON(
  schema: JsonObject,
  options?: Partial<typeof DEFAULT_OPTIONS>
): Promise<string> {
  // Add 'tsType' fields as needed
  const newSchema = addTsType(schema) as JsonObject;

  // Merge the provided optons with the defaults
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Import Decimal128 if the type annotations use it
  const imports = hasDecimal128(schema)
    ? ["import { Decimal128 } from 'bson';"]
    : [];

  const opts = {
    ...mergedOptions,
    bannerComment: [...mergedOptions.bannerComment, ...imports].join("\n"),
  };

  // Generate types
  const output = await compileJSON(
    newSchema,
    "",
    (opts as unknown) as Partial<CompileJSONOptions>
  );

  return output;
}
