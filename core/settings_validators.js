function createRangeValidator(minimum, maximum) {
  return value => value >= minimum && value <= maximum;
}

function isBoolean(value) {
  return typeof value === 'boolean';
}

function createDiscreteOptionValidator(optionsArray) {
  return value => optionsArray.indexOf(value) !== -1;
}

module.exports = {
  createRangeValidator,
  isBoolean,
  createDiscreteOptionValidator,
};
