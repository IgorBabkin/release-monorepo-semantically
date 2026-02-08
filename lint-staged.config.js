export default {
  '*.{ts,js}': ['prettier --write', 'eslint --fix'],
  '*.ts': () => 'tsc --noEmit',
  '*.{json,md,yml,yaml,hbs}': ['prettier --write'],
};
