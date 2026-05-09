import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { signToken } from '../../lib/auth.js';
import { seedDefaultData, verifyLogin } from '../../lib/database.js';

export async function onRequestPost(context) {
  try {
    await seedDefaultData();

    const body = await context.request.json();
    const user = await verifyLogin(body.username, body.password);
    if (!user) return json({ message: '用户名或密码错误。' }, 401);

    return json({ token: await signToken(user), user });
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
