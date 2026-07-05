import { convexAuth } from "@convex-dev/auth/server";
import { Password } from '@convex-dev/auth/providers/Password'
import { ConvexError } from 'convex/values'

const allowedUsers = {
  admin: 'admin',
  staff: 'staff',
}

const UsernamePassword = Password({
  profile(params) {
    const username = String(params.email ?? '').trim().toLowerCase()
    const role = allowedUsers[username]

    if (!role) {
      throw new ConvexError('This username is not authorized.')
    }

    return {
      email: username,
      username,
      name: role === 'admin' ? 'Administrator' : 'Staff Member',
      role,
    }
  },
  validatePasswordRequirements(password) {
    if (
      password.length < 10 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/\d/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      throw new ConvexError(
        'Password must have at least 10 characters, including uppercase, lowercase, number, and symbol.',
      )
    }
  },
})

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [UsernamePassword],
});
