import { json, handleError, onRequestOptions } from '../../lib/response.js';
import { signToken } from '../../lib/auth.js';
import { getMaintenanceStatus, registerMember } from '../../lib/database.js';

export async function onRequestPost(context) {
  try {
    if (await getMaintenanceStatus()) {
      return json({ message: '系统处于维护模式，暂不开放注册。' }, 503);
    }
    const body = await context.request.json();
    const user = await registerMember(body);
    return json({ token: await signToken(user), user }, 201);
  } catch (error) {
    return handleError(error);
  }
}

export { onRequestOptions };
