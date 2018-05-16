function createRangeValidator(minimum, maximum) {
  if (maximum < minimum) {
    throw new Error('Maximum is less than minimum');
  }

  return value => value >= minimum && value <= maximum;
}

function isBoolean(value) {
  return typeof value === 'boolean';
}

function createDiscreteOptionValidator(optionsArray) {
  if (!optionsArray || optionsArray.length === 0) {
    throw new Error('No options array, or it is empty.');
  }

  return value => optionsArray.indexOf(value) !== -1;
}

module.exports = {
  createRangeValidator,
  isBoolean,
  createDiscreteOptionValidator,
};
