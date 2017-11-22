FILES="\
  core/* \
  core/commands/* \
  core/implementations/* \
  core/util/* \
  test/*"

jscs -c ./style_rules.json ${FILES}