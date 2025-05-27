export const getInstagramUsernameFromUrl = (url: string) => {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  const username = pathname.split('/')[1];
  return username;
}