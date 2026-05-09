import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { signToken } from '../../lib/auth.js';
import { getMaintenanceStatus, seedDefaultData, verifyLogin } from '../../lib/database.js';

export async function onRequestPost(context) {
  try {
    await seedDefaultData();

    const body = await context.request.json();
    const user = await verifyLogin(body.username, body.password);
    if (!user) return json({ message: '用户名或密码错误。' }, 401);

    // During maintenance mode, only admins can log in
    if (await getMaintenanceStatus() && user.role !== 'admin') {
      return json({ message: '系统维护中，仅管理员可登录。' }, 503);
    }

    return json({ token: await signToken(user), user });
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
