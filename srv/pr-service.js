const cds = require('@sap/cds');

const APPROVAL_THRESHOLDS = {
    AUTO:       1000,
    DEPT_MGR:   10000,
    PURCH_MGR:  50000
}

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

        //Update the PR status to S = Submitted
        await UPDATE('PurchaseRequests').set({ status: 'S' }).where({ id: id })
        
        //Insert new line in Approval Logs
        await INSERT.into('ApprovalLogs').values({
            ID: cds.utils.uuid(),
            pr_id: id,
            action: 'S',
            approverRole: 'Requester',
            approvedBy: req.user.id,
            valueAtTime: pr.totalValue
        })

        if(pr.totalValue <= APPROVAL_THRESHOLDS.AUTO){
            //Update the PR status to A = Approved (automatically)
            await UPDATE('PurchaseRequests').set({ status: 'A' }).where({ id: id })
            await INSERT.into('ApprovalLogs').values({
                ID: cds.utils.uuid(),
                pr_id: id,
                action: 'A',
                approverRole: 'SYSTEM',
                approvedBy: 'SYSTEM',
                valueAtTime: pr.totalValue
            })
        }
    }),

    srv.before(['CREATE', 'UPDATE'], 'PurchaseRequestItems', async (req) => {
        //Validation - Quantity and unit price must be positive values
        const { quantity, unitPrice } = req.data
        if (quantity <= 0 || unitPrice <= 0) {
            return req.error(400, 'Quantity and unit price must be positive values')
        }

        //Validation - Critical materials require a preferred supplier
        const { material_id, supplier_id } = req.data
        const material = await SELECT.one.from('Material').where({ id: material_id })
        if (material.isCritical && !supplier_id){
            return req.error(400, 'Critical materials require a preferred supplier')
        }
    }),

    srv.on('approvePR', 'PurchaseRequests', async (req) => {
        //Insufficient authorization for this approval value
        const id = req.params[0].id
        const { comments, approverRole } = req.data
        const pr = await SELECT.one.from('PurchaseRequests').where({ id: id })

        if (pr.totalValue > APPROVAL_THRESHOLDS.PURCH_MGR && approverRole !== 'PlantManager') {
            return req.error(403, 'Insufficient authorization for this approval value')
        }
        if (pr.totalValue > APPROVAL_THRESHOLDS.DEPT_MGR && approverRole !== 'PurchasingManager' && approverRole !== 'PlantManager') {
            return req.error(403, 'Insufficient authorization for this approval value')
        }
        if (pr.totalValue > APPROVAL_THRESHOLDS.AUTO && approverRole !== 'DepartmentManager' && approverRole !== 'PurchasingManager' && approverRole !== 'PlantManager') {
            return req.error(403, 'Insufficient authorization for this approval value')
        }

        await UPDATE('PurchaseRequests').set({ status: 'A' }).where({ id: id })
        await INSERT.into('ApprovalLogs').values({
            ID: cds.utils.uuid(),
            pr_id: id,
            action: 'A',
            approverRole: 'Manager',
            approvedBy: 'manager',
            valueAtTime: pr.totalValue
        })
    }),

    srv.on('rejectPR', 'PurchaseRequests', async (req) => {
        //Validation - A rejection reason must be provided (min. 10 characters)
        const id = req.params[0].id
        const pr = await SELECT.one.from('PurchaseRequests').where({ id: id })
        const { reason } = req.data
        if (!reason || reason.length < 10){
            return req.error(400, 'A rejection reason must be provided (min. 10 characters)')
        }

        await UPDATE('PurchaseRequests').set({ status: 'R' }).where({ id: id })
        await INSERT.into('ApprovalLogs').values({
            ID: cds.utils.uuid(),
            pr_id: id,
            action: 'R',
            approverRole: 'Requester',
            approvedBy: req.user.id,
            valueAtTime: pr.totalValue
        })
    }),

    srv.on('cancelPR', 'PurchaseRequests', async (req) => {
        //Validation - Only DRAFT requests can be cancelled
        const id = req.params[0].id
        const pr = await SELECT.one.from('PurchaseRequests').where({ id: id })
        if(pr.status !== 'D'){
            return req.error(400, 'Only DRAFT requests can be cancelled')
        }
    })
})