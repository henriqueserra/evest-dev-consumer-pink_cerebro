import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { EverestLogService } from './everest.log.services';
import { EverestErrorServices } from './everest.error.services';
import { Demanda } from './entities/demanda';
import { randomUUID } from 'crypto';
import { SqsServices } from './sqs.service';
import { SendMessageCommandOutput } from '@aws-sdk/client-sqs';
import { PortalUploads } from './entities/portal_uploads';
import { ensureDataSourceInitialized } from '../everest.orm.service';
import { Email } from './entities/email';

export interface GmailEmailResponse {
  id: string;
  labelIds: string[];
  threadId: string;
}

const routeName = 'GmailService';
const logService = new EverestLogService();

export class GmailService {
  // public static async sendNotificacao({
  //   to = ['henrique.serra@oito.srv.br'],
  //   subject,
  // }: {
  //   to?: string[];
  //   subject: string;
  // }) {
  //   const methodName = `${routeName}.sendNotificacao`;
  //   try {
  //     const axiosRequest: AxiosRequestConfig = {
  //       method: 'POST',
  //       url: 'http://44.213.41.119:8037/email/notificacao',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       data: {
  //         to,
  //         subject,
  //       },
  //     };

  //     const response: AxiosResponse = await axios(axiosRequest);

  //     logService.info({ message: 'Email enviado com sucesso', method: methodName });

  //     return response;
  //   } catch (error: any) {
  //     await logService.error({
  //       message: error.message,
  //       method: `${routeName}.sendNotificacao`,
  //       payload: { to, subject },
  //     });
  //     throw new Error(`${routeName}.sendNotificacao - ${error.message}`);
  //   }
  // }

  // public static async sendHtmlBase64({
  //   from,
  //   to,
  //   cc,
  //   bcc,
  //   subject,
  //   content,
  //   mimeType = 'text/html',
  //   replyTo,
  //   attachments,
  // }: {
  //   from: {
  //     email: string;
  //     name: string;
  //   };
  //   to: string[];
  //   cc?: string[];
  //   bcc?: string[];
  //   subject: string;
  //   content: string;
  //   mimeType?: string;
  //   replyTo?: string[];
  //   attachments?: {
  //     filename: string;
  //     content: string; // base64
  //     mimeType: string;
  //   }[];
  // }) {
  //   const methodName = `${routeName}.sendHtmlBase64`;
  //   try {
  //     // Remove null values from to
  //     to = to.filter((email) => email !== null);
  //     cc = cc?.filter((email) => email !== null);
  //     bcc = bcc?.filter((email) => email !== null);

  //     const axiosRequest: AxiosRequestConfig = {
  //       method: 'POST',
  //       url: 'http://44.213.41.119:8037/email/html_base64',
  //       // url: 'http://localhost:8037/email/html_base64',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       data: {
  //         from,
  //         to,
  //         cc: cc ?? [],
  //         bcc: bcc ?? [],
  //         subject,
  //         html: content,
  //         mimeType,
  //         replyTo: replyTo ?? [from.email],
  //         attachments,
  //       },
  //     };

  //     const response: AxiosResponse = await axios(axiosRequest);

  //     logService.info({ message: `Email enviado com sucesso: ${response.data.id}`, method: methodName });

  //     return response;
  //   } catch (error: any) {
  //     await logService.error({
  //       message: error.message,
  //       method: `${routeName}.sendHtmlBase64`,
  //       payload: { from, to, cc, bcc, subject, content, mimeType, replyTo, attachments },
  //     });
  //     throw new Error(`${routeName}.sendHtmlBase64 - ${error.message}`);
  //   }
  // }

  /* -------------------------------------------------------------------------- */
  static async sendEmail(email: Email): Promise<SendMessageCommandOutput> {
    const methodName = 'sendEmail';
    try {
      const result = await SqsServices.sqsSendMessageFifo({
        queueName: `EverestProdEmailSqs.fifo`,
        messageBody: JSON.stringify(email),
        messageGroupId: randomUUID(),
      });

      logService.info({ message: `Email sent to the queue ${result.MessageId}`, method: methodName });
      return result;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      console.error(JSON.stringify({ message: errorMessage, method: methodName }));
      throw new Error(errorMessage);
    }
  }

  static async sendEmailCliente(email: Email & { pk: string }): Promise<SendMessageCommandOutput> {
    const methodName = 'sendEmailCliente';
    try {
      const dataSource = await ensureDataSourceInitialized();
      const demandaRepo = dataSource.getRepository(Demanda);
      const demanda = await demandaRepo.findOne({ where: { pk: email.pk }, relations: ['cliente'] });
      if (!demanda) {
        throw new Error(`Demanda ${email.pk} não encontrada`);
      }
      email.cliente = demanda.cliente.cliente;
      const result = await this.sendEmail(email);
      logService.info({ message: `Email sent to the queue ${result.MessageId}`, method: methodName });
      return result;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      console.error(JSON.stringify({ message: errorMessage, method: methodName }));
      throw new Error(`${methodName} - ${errorMessage}`);
    }
  }

  static async sendEmailNotificacao(email: Email): Promise<SendMessageCommandOutput> {
    const methodName = 'sendEmailNotificacao';
    try {
      const result = await this.sendEmail(email);
      logService.info({ message: `Email sent to the queue ${result.MessageId}`, method: methodName });
      return result;
    } catch (error: any) {
      const errorMessage = EverestErrorServices.getError(error);
      console.error(JSON.stringify({ message: errorMessage, method: methodName }));
      throw new Error(`${methodName} - ${errorMessage}`);
    }
  }

  static async notificaErroBff({
    metodo,
    payload,
    errorMessage,
    emailsAdicionais = [],
    attachments = [],
  }: {
    metodo: string;
    payload: any;
    errorMessage?: string;
    emailsAdicionais?: string[];
    attachments?: {
      filename: string;
      content: string; // base64
      mimeType: string;
    }[];
  }): Promise<SendMessageCommandOutput> {
    const methodName = `${routeName}.notificaErroBff`;
    try {
      const email: Email = {
        from: {
          email: 'everest@oito.srv.br',
          name: 'Henrique Serra',
        },
        to: [...emailsAdicionais, 'henrique.serra@oito.srv.br'],
        cc: [],
        bcc: [],
        subject: `${metodo} - Erro`,
        body: `
          <h1>Erro</h1>
          <p>${errorMessage}</p>
          <p>Payload: ${JSON.stringify(payload)}</p>
        `,
      };

      const result = await this.sendEmail(email);
      logService.info({ message: `Email sent to the queue ${result.MessageId}`, method: methodName });
      return result;
    } catch (error: any) {
      await logService.error({
        message: error.message,
        method: methodName,
        payload: {
          metodo,
          payload,
          errorMessage,
          emailsAdicionais,
          attachments,
        },
      });
      throw new Error(`${routeName}.notificaErroBff - ${error.message}`);
    }
  }

  public static async enviaConfirmacaoPortalUploads(
    payload: EnviaConfirmacaoPortalUploadsInterface
  ): Promise<SendMessageCommandOutput> {
    const methodName = `${routeName}.enviaConfirmacaoPortalUploads`;
    try {
      const template = templateConfirmacaoPortalUploads;

      const content = Object.keys(payload).reduce((acc, key) => {
        return acc.replaceAll(`{{${key}}}`, payload[key]);
      }, template);

      const email: Email = {
        from: { name: 'Portal de Uploads', email: 'everest@oito.srv.br' },
        to: [payload.created_by],
        cc: [],
        bcc: [],
        subject: '[Everest] Confirmação de recebimento de arquivo',
        body: content,
        pk: payload.pk,
        portal_uploads: true,
      };

      const result = await this.sendEmail(email);
      logService.info({ message: `Email sent to the queue ${result.MessageId}`, method: methodName });
      return result;
    } catch (error: any) {
      await logService.error({ message: error.message, method: methodName, payload: payload });
      throw new Error(`enviaConfirmacaoPortalUploads - ${JSON.stringify(error?.message)}`);
    }
  }
}

export interface EnviaConfirmacaoPortalUploadsInterface {
  data_recebimento: string;
  file_name: string;
  pk: string;
  created_by: string;
}

const templateConfirmacaoPortalUploads = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html data-editor-version="2" class="sg-campaigns" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1" />
    <!--[if !mso]><!-->
    <meta http-equiv="X-UA-Compatible" content="IE=Edge" />
    <!--<![endif]-->
    <!--[if (gte mso 9)|(IE)]>
      <xml>
        <o:OfficeDocumentSettings>
          <o:AllowPNG />
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    <![endif]-->
    <!--[if (gte mso 9)|(IE)]>
      <style type="text/css">
        body {
          width: 600px;
          margin: 0 auto;
        }
        table {
          border-collapse: collapse;
        }
        table,
        td {
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        img {
          -ms-interpolation-mode: bicubic;
        }
      </style>
    <![endif]-->
    <style type="text/css">
      body,
      p,
      div {
        font-family: arial, helvetica, sans-serif;
        font-size: 14px;
      }
      body {
        color: #000000;
      }
      body a {
        color: #1188e6;
        text-decoration: none;
      }
      p {
        margin: 0;
        padding: 0;
      }
      table.wrapper {
        width: 100% !important;
        table-layout: fixed;
        -webkit-font-smoothing: antialiased;
        -webkit-text-size-adjust: 100%;
        -moz-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }
      img.max-width {
        max-width: 100% !important;
      }
      .column.of-2 {
        width: 50%;
      }
      .column.of-3 {
        width: 33.333%;
      }
      .column.of-4 {
        width: 25%;
      }
      ul ul ul ul {
        list-style-type: disc !important;
      }
      ol ol {
        list-style-type: lower-roman !important;
      }
      ol ol ol {
        list-style-type: lower-latin !important;
      }
      ol ol ol ol {
        list-style-type: decimal !important;
      }
      @media screen and (max-width: 480px) {
        .preheader .rightColumnContent,
        .footer .rightColumnContent {
          text-align: left !important;
        }
        .preheader .rightColumnContent div,
        .preheader .rightColumnContent span,
        .footer .rightColumnContent div,
        .footer .rightColumnContent span {
          text-align: left !important;
        }
        .preheader .rightColumnContent,
        .preheader .leftColumnContent {
          font-size: 80% !important;
          padding: 5px 0;
        }
        table.wrapper-mobile {
          width: 100% !important;
          table-layout: fixed;
        }
        img.max-width {
          height: auto !important;
          max-width: 100% !important;
        }
        a.bulletproof-button {
          display: block !important;
          width: auto !important;
          font-size: 80%;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }
        .columns {
          width: 100% !important;
        }
        .column {
          display: block !important;
          width: 100% !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          margin-left: 0 !important;
          margin-right: 0 !important;
        }
        .social-icon-column {
          display: inline-block !important;
        }
      }
    </style>
    <!--user entered Head Start-->
    <!--End Head user entered-->
  </head>
  <body>
    <center
      class="wrapper"
      data-link-color="#1188E6"
      data-body-style="font-size:14px; font-family:arial,helvetica,sans-serif; color:#000000; background-color:#FFFFFF;">
      <div class="webkit">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" class="wrapper" bgcolor="#FFFFFF">
          <tr>
            <td valign="top" bgcolor="#FFFFFF" width="100%">
              <table
                width="100%"
                role="content-container"
                class="outer"
                align="center"
                cellpadding="0"
                cellspacing="0"
                border="0">
                <tr>
                  <td width="100%">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td>
                          <!--[if mso]>
    <center>
    <table><tr><td width="600">
  <![endif]-->
                          <table
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            style="width: 100%; max-width: 600px"
                            align="center">
                            <tr>
                              <td
                                role="modules-container"
                                style="padding: 0px 0px 0px 0px; color: #000000; text-align: left"
                                bgcolor="#FFFFFF"
                                width="100%"
                                align="left">
                                <table
                                  class="module preheader preheader-hide"
                                  role="module"
                                  data-type="preheader"
                                  border="0"
                                  cellpadding="0"
                                  cellspacing="0"
                                  width="100%"
                                  style="
                                    display: none !important;
                                    mso-hide: all;
                                    visibility: hidden;
                                    opacity: 0;
                                    color: transparent;
                                    height: 0;
                                    width: 0;
                                  ">
                                  <tr>
                                    <td role="module-content">
                                      <p>[Everest] Confirmação de recebimento de arquivo</p>
                                    </td>
                                  </tr>
                                </table>
                                <table
                                  class="wrapper"
                                  role="module"
                                  data-type="image"
                                  border="0"
                                  cellpadding="0"
                                  cellspacing="0"
                                  width="100%"
                                  style="table-layout: fixed"
                                  data-muid="bfce1f01-5406-4539-8279-78e4520b0abe">
                                  <tbody>
                                    <tr>
                                      <td
                                        style="font-size: 6px; line-height: 10px; padding: 0px 0px 0px 0px"
                                        valign="top"
                                        align="right">
                                        <img
                                          class="max-width"
                                          border="0"
                                          style="
                                            display: block;
                                            color: #000000;
                                            text-decoration: none;
                                            font-family: Helvetica, arial, sans-serif;
                                            font-size: 16px;
                                            max-width: 30% !important;
                                            width: 30%;
                                            height: auto !important;
                                          "
                                          width="180"
                                          alt=""
                                          data-proportionally-constrained="true"
                                          data-responsive="true"
                                          src="http://cdn.mcauto-images-production.sendgrid.net/4ad13c548b013c4a/e187c5b7-5109-4ae7-a975-975a1cbd923c/788x310.png" />
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                                <table
                                  class="module"
                                  role="module"
                                  data-type="spacer"
                                  border="0"
                                  cellpadding="0"
                                  cellspacing="0"
                                  width="100%"
                                  style="table-layout: fixed"
                                  data-muid="ab8e75c2-b947-4e72-a0b6-bc204cecb3fd">
                                  <tbody>
                                    <tr>
                                      <td style="padding: 0px 0px 50px 0px" role="module-content" bgcolor=""></td>
                                    </tr>
                                  </tbody>
                                </table>
                                <table
                                  class="module"
                                  role="module"
                                  data-type="divider"
                                  border="0"
                                  cellpadding="0"
                                  cellspacing="0"
                                  width="100%"
                                  style="table-layout: fixed"
                                  data-muid="9145d99f-55ee-4b4c-adf1-5c8997297d59">
                                  <tbody>
                                    <tr>
                                      <td
                                        style="padding: 0px 0px 0px 0px"
                                        role="module-content"
                                        height="100%"
                                        valign="top"
                                        bgcolor="">
                                        <table
                                          border="0"
                                          cellpadding="0"
                                          cellspacing="0"
                                          align="center"
                                          width="100%"
                                          height="4px"
                                          style="line-height: 4px; font-size: 4px">
                                          <tbody>
                                            <tr>
                                              <td style="padding: 0px 0px 4px 0px" bgcolor="#6b097b"></td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                                <table
                                  class="module"
                                  role="module"
                                  data-type="text"
                                  border="0"
                                  cellpadding="0"
                                  cellspacing="0"
                                  width="100%"
                                  style="table-layout: fixed"
                                  data-muid="a644a4ab-6ee1-4928-81e9-0ff91d696d88"
                                  data-mc-module-version="2019-10-22">
                                  <tbody>
                                    <tr>
                                      <td
                                        style="padding: 18px 0px 18px 0px; line-height: 22px; text-align: inherit"
                                        height="100%"
                                        valign="top"
                                        bgcolor=""
                                        role="module-content">
                                        <div>
                                          <div style="font-family: inherit; text-align: inherit"><br /></div>
                                          <div style="font-family: inherit; text-align: inherit">
                                            Confirmamos o recebimemnto em <strong>{{data_recebimento}}</strong> do
                                            arquivo <strong>{{file_name}}</strong>
                                          </div>
                                          <div style="font-family: inherit; text-align: inherit"><br /></div>
                                          <div style="font-family: inherit; text-align: inherit">
                                            Foi atribuido a este arquivo o id <strong>{{pk}}</strong>
                                          </div>
                                          <div style="font-family: inherit; text-align: inherit"><br /></div>
                                          <div style="font-family: inherit; text-align: inherit">Atenciosamente</div>
                                          <div style="font-family: inherit; text-align: inherit"><br /></div>
                                          <div style="font-family: inherit; text-align: inherit">Equipe Oito</div>
                                          <div style="font-family: inherit; text-align: inherit"><br /></div>
                                          <div></div>
                                        </div>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                                <table
                                  class="module"
                                  role="module"
                                  data-type="divider"
                                  border="0"
                                  cellpadding="0"
                                  cellspacing="0"
                                  width="100%"
                                  style="table-layout: fixed"
                                  data-muid="9145d99f-55ee-4b4c-adf1-5c8997297d59.1">
                                  <tbody>
                                    <tr>
                                      <td
                                        style="padding: 0px 0px 0px 0px"
                                        role="module-content"
                                        height="100%"
                                        valign="top"
                                        bgcolor="">
                                        <table
                                          border="0"
                                          cellpadding="0"
                                          cellspacing="0"
                                          align="center"
                                          width="100%"
                                          height="4px"
                                          style="line-height: 4px; font-size: 4px">
                                          <tbody>
                                            <tr>
                                              <td style="padding: 0px 0px 4px 0px" bgcolor="#6b097b"></td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                                <table
                                  class="module"
                                  role="module"
                                  data-type="code"
                                  border="0"
                                  cellpadding="0"
                                  cellspacing="0"
                                  width="100%"
                                  style="table-layout: fixed"
                                  data-muid="c1c98dc0-b7e5-4243-a352-c7dfb9597d98">
                                  <tbody>
                                    <tr>
                                      <td height="100%" valign="top" role="module-content">
                                        <div style="font-family: inherit; text-align: center">
                                          <span style="color: #710a94"
                                            >Copyright © Oito Tecnologia Jurídica. Todos os direitos reservados.</span
                                          >
                                        </div>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </table>
                          <!--[if mso]>
                                  </td>
                                </tr>
                              </table>
                            </center>
                            <![endif]-->
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    </center>
  </body>
</html>
`;
