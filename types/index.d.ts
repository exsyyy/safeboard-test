type React = import('@types/react');

declare module '*.css' {
  // eslint-disable-next-line init-declarations
  const content: { [classNames: string]: string };
  export default content;
}

declare module '*.module.less' {
  // eslint-disable-next-line init-declarations
  const content: { [classNames: string]: string };
  export default content;
}

declare module '*.png' {
  // eslint-disable-next-line init-declarations
  const src: string;
  export default src;
}
