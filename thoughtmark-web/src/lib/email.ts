/**
 * 邮件工具（Story 5.4）
 *
 * 使用 Nodemailer + SMTP（QQ/163 邮箱）发送邮件
 * 环境变量：SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */
import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.qq.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "", // QQ 邮箱授权码（非登录密码）
  },
})

/**
 * 发送邮件
 * @param to - 收件人
 * @param subject - 主题
 * @param html - HTML 内容
 */
export async function sendEmail(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "",
      to,
      subject,
      html,
    })
    console.log(`[Email] 发送成功: ${to} — ${subject}`)
  } catch (error) {
    console.error(`[Email] 发送失败: ${to}`, error)
    throw error
  }
}
