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

## getCodecFromSerialized

Derive a codec for any given sum `A` provided codecs for all its members'
values, decoding and encoding to/from `Serialized<A>`.

**Signature**

```ts
export declare const getCodecFromSerialized: <A extends Sum.AnyMember>(
  cs: MemberCodecs<A>,
  name?: string
) => t.Type<A, Serialized<A>, unknown>
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
) => t.Type<Serialized<A>, Serialized<A>, unknown>
```

Added in v0.1.0
