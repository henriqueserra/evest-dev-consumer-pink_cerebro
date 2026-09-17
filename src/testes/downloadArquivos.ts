import { AppDataSource, ensureDataSourceInitialized } from '../everest.orm.service';
import { Demanda } from '../libs/entities/demanda';
import { S3Service } from '../libs/s3.service';
import fs from 'fs';

const query = `select da.*
from prod.demandas d
         left join prod.demanda_arquivos da using (pk)
where d.cliente = 'ReturnCadastro'
  and d.is_active = true
  and d.origem = 'Portal Uploads'
  and d.created_by <> 'guilherme.locateli@oito.srv.br'
  and d.perfil_demanda = 'NotificacaoExtrajudicial1'
  and lower(da.file_name) not like '%evidencia%'
  and da.is_active = true
order by created_at desc
limit 100;`;

const teste = async () => {
  const dataSource = await ensureDataSourceInitialized();
  const response = await dataSource.query(query);
  let total = response.length;
  // Process in parallel, 50 at a time (batches)
  const batchSize = 50;
  for (let i = 0; i < response.length; i += batchSize) {
    const batch = response.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async (item) => {
        total--;
        console.log(`${total} arquivos restantes`);
        try {
          const buffer = await S3Service.s3GetObject({
            s3Bucket: item.s3_bucket,
            s3Key: item.s3_key,
          });
          const fileName = item.file_name;
          const filePath = `./downloads/${fileName}`;
          fs.writeFileSync(filePath, buffer as Buffer);
        } catch (error) {
          return;
        }
      })
    );
  }
};

teste().then(console.log).catch(console.error);
