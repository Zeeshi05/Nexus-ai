export const getCount = () => {
  const value = localStorage.getItem('counter');
  return value ? parseInt(value, 10) : 0;
};

export const saveCount = (value) => {
  localStorage.setItem('counter', value.toString());
};