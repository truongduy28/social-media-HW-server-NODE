const randomCatAvatar = () => {
  const list = [
    "https://cdn.dribbble.com/users/6051/screenshots/15142201/media/26ef11393c324f4b65e328ded91ec64d.png",
    "https://cdn.dribbble.com/users/6051/screenshots/14738275/media/dbf64fc15852541d976bdeebf31ccb23.png",
    "https://cdn.dribbble.com/users/6051/screenshots/14563224/media/b0c4eb2ccc8bce885c930f18559f8971.png",
    "https://cdn.dribbble.com/users/6051/screenshots/14089340/media/1fdbfdaf6d1dc5d9dda26c56c77051ab.png",
    "https://cdn.dribbble.com/users/6051/screenshots/6060590/media/ec547536b81db7d26012f4339c26f7eb.png",
    "https://cdn.dribbble.com/users/6051/screenshots/7286526/media/24f6cb1982b8e3209013a86f64cec790.png",
    "https://cdn.dribbble.com/users/2313212/screenshots/14714869/media/2c89da7b1e1212f2ca3c4bd65a1194ab.jpg",
    "https://cdn.dribbble.com/userupload/3877619/file/original-8ec719652cc963b0c42cc22d561ecee5.jpg",
    "https://cdn.dribbble.com/users/916023/screenshots/16704318/media/abddc7fc0450bf8e6145f52f2753ac37.png",
    "https://cdn.dribbble.com/users/916023/screenshots/14873242/media/a379bc040ab7f090580ed39c6e13c551.png",
    "https://cdn.dribbble.com/users/916023/screenshots/14530686/media/0fa98f3da185e407e6fbf1ded12a3a89.png",
  ];
  return list[Math.floor(Math.random() * list.length)];
};
module.exports = randomCatAvatar;
