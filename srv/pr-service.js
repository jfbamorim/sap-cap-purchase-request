const cds = require('@sap/cds');

module.exports = cds.service.impl(async function(srv) {
    srv.on('submitPR', 'PurchaseRequests', async (req) => {
        //Validation - Purchase Request must have at least one item
        const id = req.params[0].id
        const items = await SELECT.from('PurchaseRequestItems').where({ pr_id: id })
        if (items.length < 1) {
            return req.error(400, 'A Purchase Request must have at least one item')
        }

        //Validation - Required date must be in the future
        const pr = await SELECT.one.from('PurchaseRequests').where({ id: id })
        const today = new Date().toISOString().split('T')[0]
        if (pr.requiredDate <= today){
            return req.error(400, 'Required date must be in the future')
        }

        //Validation - Justification is mandatory for high priority requests
        if (pr.priority >= '3' && !pr.justification){
            return req.error(400, 'Justification is mandatory for high priority requests')
        }
    })
})