const roleRank = {
  USER: 1,
  OWNER: 2,
  TREASURER: 3,
  ADMIN: 4,
};

export default function requireRole(minRole) {
  return (req, res, next) => {
    if (roleRank[req.user.role] < roleRank[minRole]) {
      return res.status(403).json({ error: "Permission refusée" });
    }
    next();
  };
}