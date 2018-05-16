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

function createBooleanToStringConverter(trueValue, falseValue) {
  return value => value ? trueValue : falseValue;
}

function toStringLowercase(value) {
  return toString(value).toLowerCase();
}

module.exports = {
  stringToFloat,
  toString,
  stringToInt,
  createStringToBooleanConverter,
  createBooleanToStringConverter,
  toStringLowercase,
};
