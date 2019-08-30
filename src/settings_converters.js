function stringToFloat(value) {
  return parseFloat(value);
}

function toString(value) {
  return `${value}`;
}

function stringToInt(value) {
  return parseInt(value);
}

function createStringToBooleanConverter(trueValue, falseValue) {
  const trueValueLowerCase = trueValue.toLowerCase();
  const falseValueLowerCase = falseValue.toLowerCase();

  return value => {
    let valueLowerCase = value.toLowerCase();
    if (valueLowerCase === trueValueLowerCase) {
      return true;
    }
    if (valueLowerCase === falseValueLowerCase) {
      return false;
    }
    return 0;
  };
}

function createStringToStringArrayConverter(separator) {
  return value => value.split(separator);
}

function createStringArrayToStringConverter(separator) {
  return value => value.join(separator);
}

function createBooleanToStringConverter(trueValue, falseValue) {
  return value => value ? trueValue : falseValue;
}

function toStringLowercase(value) {
  return toString(value).toLowerCase();
}

function createMapConverter(map, lowercase) {
  return value => lowercase ? map[value.toLowerCase()] : map[value];
}

function createInverseMapConverter(map) {
  return value => {
    for (key in map) {
      if (map[key] === value) {
        return key;
      }
    }
  };
}

module.exports = {
  stringToFloat,
  toString,
  stringToInt,
  createStringToBooleanConverter,
  createBooleanToStringConverter,
  toStringLowercase,
  createStringToStringArrayConverter,
  createStringArrayToStringConverter,
  createMapConverter,
  createInverseMapConverter,
};
