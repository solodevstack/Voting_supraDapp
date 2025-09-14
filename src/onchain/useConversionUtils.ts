import { useCallback } from "react";
//import { BCS, TxnBuilderTypes } from 'supra-l1-sdk'; --This is for supra-l1-sdk v^3.0.0. Super recommended to update to V4 for axios vulnerability fixes!
import { BCS, TxnBuilderTypes } from "supra-l1-sdk-core";
const useConversionUtils = () => {
  // Convert a human-readable string to Uint8Array
  const stringToUint8Array = useCallback((humanReadableStr: string) => {
    return BCS.bcsToBytes(new TxnBuilderTypes.Identifier(humanReadableStr));
  }, []);

  const serializeString = useCallback((humanReadableStr: string) => {
    return BCS.bcsSerializeStr(humanReadableStr);
  }, []);

  // Convert a crypto address to Uint8Array
  const addressToUint8Array = useCallback((cryptoAddress: string) => {
    return BCS.bcsToBytes(
      TxnBuilderTypes.AccountAddress.fromHex(cryptoAddress)
    );
  }, []);

  const deserializeString = useCallback((uint8Array: Uint8Array) => {
    const deserializer = new BCS.Deserializer(uint8Array);
    return deserializer.deserializeStr();
  }, []);

  const deserializeUint64 = useCallback((uint8Array: Uint8Array) => {
    const deserializer = new BCS.Deserializer(uint8Array);
    return deserializer.deserializeU64();
  }, []);

  const deserializeUint8 = useCallback((uint8Array: Uint8Array) => {
    const deserializer = new BCS.Deserializer(uint8Array);
    return deserializer.deserializeU8();
  }, []);

  const deserializeBool = useCallback((uint8Array: Uint8Array) => {
    const deserializer = new BCS.Deserializer(uint8Array);
    return deserializer.deserializeBool();
  }, []);
  const deserializeOptionU64 = useCallback((uint8Array: Uint8Array) => {
    const deserializer = new BCS.Deserializer(uint8Array);
    const hasValue = deserializer.deserializeBool();
    if (hasValue) {
        return deserializer.deserializeU64();
    }
    return null;
    }, []);


  const deserializeAddress = useCallback((uint8Array: Uint8Array) => {
    const deserializer = new BCS.Deserializer(uint8Array);
    const addressBytes = deserializer.deserializeFixedBytes(32);
    // Convert bytes to hex string manually
    return (
      "0x" +
      Array.from(addressBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
  }, []);

  const deserializeVector = useCallback(
    (
      uint8Array: Uint8Array,
      elementType: "u8" | "u64" | "bool" | "string" | "address"
    ) => {
      const deserializer = new BCS.Deserializer(uint8Array);
      const length = deserializer.deserializeUleb128AsU32();
      const result = [];

      for (let i = 0; i < length; i++) {
        if (elementType === "u8") {
          result.push(deserializer.deserializeU8());
        } else if (elementType === "u64") {
          result.push(deserializer.deserializeU64());
        } else if (elementType === "bool") {
          result.push(deserializer.deserializeBool());
        } else if (elementType === "string") {
          result.push(deserializer.deserializeStr());
        } else if (elementType === "address") {
          const addressBytes = deserializer.deserializeFixedBytes(32);
          result.push(
            "0x" +
              Array.from(addressBytes)
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("")
          );
        }
      }

      return result;
    },
    []
  );

  // Serialize a uint64 value
  const serializeUint64 = useCallback((value: bigint) => {
    return BCS.bcsSerializeUint64(value);
  }, []);

  // Serialize a uint8 value
  const serializeUint8 = useCallback((value: number) => {
    return BCS.bcsSerializeU8(value);
  }, []);

  const serializeU256 = useCallback((value: bigint) => {
    return BCS.bcsSerializeU256(value);
  }, []);

  const serializeBool = useCallback((value: boolean) => {
    return BCS.bcsSerializeBool(value);
  }, []);

  const serializeVector = useCallback(
    (values: any[], type: "u8" | "u64" | "bool" | "string" | "address") => {
      const serializer = new BCS.Serializer();
      serializer.serializeU32AsUleb128(values.length);

      values.forEach((value) => {
        if (type === "u64") {
          serializer.serializeU64(value as bigint);
        } else if (type === "bool") {
          serializer.serializeBool(value as boolean);
        } else if (type === "string") {
          serializer.serializeStr(value as string);
        } else if (type === "address") {
          const accountAddress = TxnBuilderTypes.AccountAddress.fromHex(
            value as string
          );
          serializer.serializeFixedBytes(accountAddress.address);
        } else {
          serializer.serializeStr(value as string);
        }
      });
      return serializer.getBytes();
    },
    []
  );
  const serializeOptionU64 = useCallback((value?: number): Uint8Array => {
  const serializer = new BCS.Serializer();
  
  if (value !== undefined) {
    // Serialize as Some(value)
    serializer.serializeBool(true);  // hasValue = true
    serializer.serializeU64(value);
  } else {
    // Serialize as None
    serializer.serializeBool(false); // hasValue = false
  }
  
  return serializer.getBytes();
}, []);

  const hexToString = (hex: string, type: string) => {
    if (!hex) {
      return "";
    }

    if (type !== "String") {
      // For numeric types, convert hex to decimal string

      try {
        return BigInt(hex).toString();
      } catch (error) {
        console.error("Error converting hex to string:", error);
        return hex;
      }
    }

    try {
      // Remove the '0x' prefix
      const cleanHex = hex.slice(2);
      // Convert hex to string and remove the first character (length prefix)
      return Buffer.from(cleanHex, "hex").toString().slice(1);
    } catch (error) {
      console.error("Error converting hex to string:", error);
      return hex;
    }
  };

  const stringToHex = (str: string) => {
    // Convert string to UTF-8 encoded bytes
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);

    // Convert bytes to hex string
    let hexString = "";
    for (let i = 0; i < bytes.length; i++) {
      const hex = bytes[i].toString(16).padStart(2, "0");
      hexString += hex;
    }

    return hexString;
  };

  return {
    stringToUint8Array,
    addressToUint8Array,
    serializeUint64,
    serializeUint8,
    serializeU256,
    serializeBool,
    serializeVector,
    deserializeString,
    deserializeUint64,
    deserializeUint8,
    deserializeBool,
    deserializeAddress,
    deserializeVector,
    hexToString,
    serializeString,
    stringToHex,
    deserializeOptionU64,
    serializeOptionU64

  };
};

export default useConversionUtils;
