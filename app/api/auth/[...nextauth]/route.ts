import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // 環境変数から認証情報を取得
        const validUsername = process.env.AUTH_USERNAME || 'admin';
        const validPassword = process.env.AUTH_PASSWORD || 'password';

        if (
          credentials?.username === validUsername &&
          credentials?.password === validPassword
        ) {
          // 認証成功
          return {
            id: '1',
            name: validUsername,
            email: `${validUsername}@example.com`,
          };
        }

        // 認証失敗
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30日間
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',
});

export { handler as GET, handler as POST };
