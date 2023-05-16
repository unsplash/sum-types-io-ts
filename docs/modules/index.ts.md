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
  - [MappedType (class)](#mappedtype-class)
    - [\_tag (property)](#_tag-property)
  - [getCodec](#getcodec)
  - [getCodecFromMappedNullaryTag](#getcodecfrommappednullarytag)
  - [getCodecFromNullaryTag](#getcodecfromnullarytag)
  - [getCodecFromPrimitiveMappedNullaryTag](#getcodecfromprimitivemappednullarytag)
  - [getCodecFromSerialized](#getcodecfromserialized)
  - [getSerializedCodec](#getserializedcodec)

---

# utils

## MappedType (class)

**Signature**

```ts
export declare class MappedType<A, B> {
  constructor(
    name: string,
    is: MappedType<A, B>['is'],
    validate: MappedType<A, B>['validate'],
    encode: MappedType<A, B>['encode'],
    readonly Map: Record<Tag<A>, B>
  )
}
```

Added in v0.5.1

### \_tag (property)

**Signature**

```ts
readonly _tag: "@unsplash/sum-types-io-ts/MappedType"
```

Added in v0.5.1

## getCodec

Derive a codec for any given sum `A` provided codecs for all its members'
values.

**Signature**

```ts
export declare const getCodec: <A extends Sum.AnyMember>(
  sum: Sum.Sum<A>
) => <B extends MemberCodecs<A>>(cs: B, name?: string) => t.Type<A, OutputsOf<A, B>, unknown>
```

Added in v0.1.0

## getCodecFromMappedNullaryTag

Derive a codec for any given sum `A` in which all the constructors are
nullary, decoding and encoding to/from the constructor tags via conversion
functions. Consider instead `getCodecFromPrimitiveMappedNullaryTag` for
stringly APIs.

**Signature**

```ts
export declare const getCodecFromMappedNullaryTag: <A extends NullaryMember>(
  sum: Sum.Sum<A>
) => <B>(
  from: (x: unknown) => O.Option<Tag<A>>,
  to: (x: Tag<A>) => B
) => <C>(tags: EveryKeyPresent<Tag<A>, C>, name?: string) => t.Type<A, B, unknown>
```

**Example**

```ts
import * as t from 'io-ts'
import * as Sum from '@unsplash/sum-types'
import { getCodecFromMappedNullaryTag } from '@unsplash/sum-types-io-ts'
import * as O from 'fp-ts/Option'
import * as E from 'fp-ts/Either'

type Weather = Sum.Member<'Sun'> | Sum.Member<'Rain'>
const Weather = Sum.create<Weather>()
type Country = 'UK' | 'Italy'

const WeatherFromCountry: t.Type<Weather, Country> = getCodecFromMappedNullaryTag(Weather)<Country>(
  (x) => {
    switch (x) {
      case 'Italy':
        return O.some('Sun')
      case 'UK':
        return O.some('Rain')
      default:
        return O.none
    }
  },
  (x) => (x === 'Sun' ? 'Italy' : 'UK')
)(['Sun', 'Rain'])

assert.deepStrictEqual(WeatherFromCountry.decode('UK'), E.right(Weather.mk.Rain))
```

Added in v0.3.0

## getCodecFromNullaryTag

Derive a codec for any given sum `A` in which all the constructors are
nullary, decoding and encoding to/from the constructor tags.

**Signature**

```ts
export declare const getCodecFromNullaryTag: <A extends NullaryMember>(
  sum: Sum.Sum<A>
) => <B>(tags: EveryKeyPresent<Tag<A>, B>, name?: string) => t.Type<A, string, unknown>
```

Added in v0.3.0

## getCodecFromPrimitiveMappedNullaryTag

A convenient alternative to `getCodecFromMappedNullaryTag` for working with
for example stringly APIs. The behaviour is unspecified if the input `Record`
contains duplicate values.

**Signature**

```ts
export declare const getCodecFromPrimitiveMappedNullaryTag: <A extends NullaryMember>(
  sum: Sum.Sum<A>
) => <B extends string | number | bigint | boolean | null | undefined>(
  tos: Record<Tag<A>, B>,
  name?: string
) => MappedType<A, B>
```

**Example**

```ts
import * as t from 'io-ts'
import * as Sum from '@unsplash/sum-types'
import { getCodecFromPrimitiveMappedNullaryTag } from '@unsplash/sum-types-io-ts'
import * as O from 'fp-ts/Option'
import * as E from 'fp-ts/Either'

type Weather = Sum.Member<'Sun'> | Sum.Member<'Rain'>
const Weather = Sum.create<Weather>()
type Country = 'UK' | 'Italy'

const WeatherFromCountry: t.Type<Weather, Country> = getCodecFromPrimitiveMappedNullaryTag(Weather)({
  Sun: 'Italy',
  Rain: 'UK',
})

assert.deepStrictEqual(WeatherFromCountry.decode('UK'), E.right(Weather.mk.Rain))
```

Added in v0.5.0

-

## getCodecFromSerialized

Derive a codec for any given sum `A` provided codecs for all its members'
values, decoding and encoding to/from `Serialized<A>`.

**Signature**

```ts
export declare const getCodecFromSerialized: <A extends Sum.AnyMember>(
  sum: Sum.Sum<A>
) => <B extends MemberCodecs<A>>(cs: B, name?: string) => t.Type<A, Sum.Serialized<OutputsOf<A, B>>, unknown>
```

Added in v0.1.0

## getSerializedCodec

Derive a codec for `Serialized<A>` for any given sum `A` provided codecs for
all its members` values.

**Signature**

```ts
export declare const getSerializedCodec: <A extends Sum.AnyMember>() => <B extends MemberCodecs<A>>(
  cs: B,
  name?: string
) => t.Type<Sum.Serialized<A>, Sum.Serialized<OutputsOf<A, B>>, unknown>
```

Added in v0.1.0
