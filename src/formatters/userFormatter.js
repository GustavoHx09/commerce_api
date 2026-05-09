export function userResponse(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    cpf: user.cpf,
    profile: user.profile,
    address: user.address,
    status: user.status
  };
}