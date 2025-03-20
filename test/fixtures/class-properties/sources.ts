class Foo {
  bar = 1;
  uninitialized;
}
const condition = 1
const output = condition === 1 ? new Foo().bar : false
