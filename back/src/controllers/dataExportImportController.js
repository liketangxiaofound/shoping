const dataExportImport = require('../services/dataExportImportService')

function sendCsv(res, filename, content) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(content)
}

async function adminExport(req, res) {
  try {
    const type = req.params.type
    const csv = await dataExportImport.exportByType(type, {})
    const name = `export_${type}_${Date.now()}.csv`
    sendCsv(res, name, csv)
  } catch (e) {
    console.error('导出失败:', e)
    res.status(400).json({ success: false, message: e.message || '导出失败' })
  }
}

async function sellerExportProducts(req, res) {
  try {
    const csv = await dataExportImport.exportByType('products', { sellerId: req.user.id })
    sendCsv(res, `seller_products_${req.user.id}_${Date.now()}.csv`, csv)
  } catch (e) {
    res.status(500).json({ success: false, message: '导出失败' })
  }
}

async function importProducts(req, res) {
  try {
    let csvText = ''
    if (req.file?.buffer) {
      csvText = req.file.buffer.toString('utf8')
    } else if (typeof req.body?.csv === 'string') {
      csvText = req.body.csv
    } else {
      return res.status(400).json({ success: false, message: '请上传 CSV 文件或提供 csv 文本' })
    }

    const result = await dataExportImport.importProducts(csvText, {
      sellerId: req.user.role === 'seller' ? req.user.id : req.body.sellerId,
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role
    })
    res.json({ success: result.success, data: result, message: result.message })
  } catch (e) {
    console.error('导入失败:', e)
    res.status(500).json({ success: false, message: e.message || '导入失败' })
  }
}

async function downloadTemplate(req, res) {
  const csv = dataExportImport.getImportTemplateCsv()
  sendCsv(res, 'product_import_template.csv', csv)
}

module.exports = {
  adminExport,
  sellerExportProducts,
  importProducts,
  downloadTemplate
}
