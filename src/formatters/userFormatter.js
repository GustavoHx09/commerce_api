export function userResponse(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    cpf: user.cpf,
    phone: user.phone,
    profile: user.profile,
    address: user.address,
    status: user.status,
    createdAt: user.createdAt
  };
}