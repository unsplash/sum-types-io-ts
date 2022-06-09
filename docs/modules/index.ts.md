---
title: index.ts
nav_order: 1
parent: Modules
---

## index overview

Added in v0.1.0

---

<h2 class="text-delta">Table of contents</h2>

- [utils](#utils)
  - [getCodec](#getcodec)
  - [getCodecFromNullaryTag](#getcodecfromnullarytag)
  - [getCodecFromSerialized](#getcodecfromserialized)
  - [getSerializedCodec](#getserializedcodec)

---

# utils

## getCodec

Derive a codec for any given sum `A` provided codecs for all its members'
values.

**Signature**

```ts
export declare const getCodec: <A extends Sum.AnyMember>(cs: MemberCodecs<A>, name?: string) => t.Type<A, A, unknown>
```

Added in v0.1.0

## getCodecFromNullaryTag

Derive a codec for any given sum `A` in which all the constructors are
nullary, decoding and encoding to/from the constructor tags.

**Signature**

```ts
export declare const getCodecFromNullaryTag: <A extends NullaryMember>() => <B>(
  tags: EveryKeyPresent<Tag<A>, B>,
  name?: string
) => t.Type<A, string, unknown>
```

Added in v0.3.0

## getCodecFromSerialized

Derive a codec for any given sum `A` provided codecs for all its members'
values, decoding and encoding to/from `Serialized<A>`.

**Signature**

```ts
export declare const getCodecFromSerialized: <A extends Sum.AnyMember>(
  cs: MemberCodecs<A>,
  name?: string
) => t.Type<A, Sum.Serialized<A>, unknown>
```

Added in v0.1.0

## getSerializedCodec

Derive a codec for `Serialized<A>` for any given sum `A` provided codecs for
all its members` values.

**Signature**

```ts
export declare const getSerializedCodec: <A extends Sum.AnyMember>(
  cs: MemberCodecs<A>,
  name?: string
) => t.Type<Sum.Serialized<A>, Sum.Serialized<A>, unknown>
```

Added in v0.1.0
