# Changelog

This project adheres to semantic versioning.

## 0.7.1 (2023-10-09)

Update `getInternallyTaggedCodec` to preserve tag when decoding.

## 0.7.0 (2023-08-11)

Add `getAdjacentlyTaggedCodec`, `getExternallyTaggedCodec`, `getInternallyTaggedCodec`, and `getUntaggedCodec` codec constructors for working with object encodings. Add `nullaryFrom` and `nullaryFromEmpty` to support said object encodings with optional member values.

## 0.6.1 (2023-08-01)

Update `getCodecFromMappedNullaryTag` to support generic input type.

## 0.6.0 (2023-05-16)

Support `@unsplash/sum-types` ^0.4.0.

## 0.5.1 (2022-12-13)

Provide access to `getCodecFromPrimitiveMappedNullaryTag` mappings via a `MappedType` subclass.

## 0.5.0 (2022-12-07)

Replace `getCodecFromStringlyMappedNullaryTag` with the more flexible `getCodecFromPrimitiveMappedNullaryTag`.

## 0.4.0 (2022-09-05)

Support `@unsplash/sum-types` ^0.3.0.

## 0.3.1 (2022-07-05)

Respect differing `A` and `O` types in codecs.

## 0.3.0 (2022-06-13)

Add `getCodecFromNullaryTag`, `getCodecFromStringlyMappedNullaryTag`, and `getCodecFromMappedNullaryTag` codec constructors.

## 0.2.1 (2022-02-21)

Add ESM support.

## 0.2.0 (2022-01-13)

Support `@unsplash/sum-types` ^0.2.1.

## 0.1.0 (2021-12-08)

The initial release of `@unsplash/sum-types-io-ts`, providing `getSerializedCodec`, `getCodecFromSerialized`, and `getCodec`.
