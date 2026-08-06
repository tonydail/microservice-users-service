import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { config } from '../config/index';

const PROTO_PATH = path.join(__dirname, 'proto/auth.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  defaults: true,
});
const proto = grpc.loadPackageDefinition(packageDef) as unknown as {
  auth: { AuthService: grpc.ServiceClientConstructor };
};

let _client: grpc.Client | null = null;

function getClient(): grpc.Client {
  if (!_client) {
    _client = new proto.auth.AuthService(
      `${config.AUTH_GRPC_HOST}:${config.AUTH_GRPC_PORT}`,
      grpc.credentials.createInsecure(),
    );
  }
  return _client;
}

export function validateToken(token: string): Promise<{ valid: boolean; userId: string }> {
  return new Promise((resolve, reject) => {
    const client = getClient() as unknown as {
      validateToken: (
        req: { token: string },
        cb: (err: Error | null, res: { valid: boolean; user_id: string }) => void,
      ) => void;
    };
    client.validateToken({ token }, (err, res) => {
      if (err) return reject(err);
      resolve({ valid: res.valid, userId: res.user_id });
    });
  });
}
