using { sap.cap.pr as db } from '../db/schema';

service PRService{
    entity PurchaseRequests as projection on db.PurchaseRequest
    actions {
        action submitPR() returns String;
        action approvePR(comments: String, approverRole: String) returns String;
        action rejectPR(reason: String) returns String;
        action cancelPR() returns String;
    };
    entity PurchaseRequestItems as projection on db.PurchaseRequestItem;
    @readonly entity Material as projection on db.Material;
    @readonly entity Suppliers            as projection on db.Supplier;
    @readonly entity Plants               as projection on db.Plant;
    @readonly entity CostCenters          as projection on db.CostCenter;
    @readonly entity ApprovalLogs         as projection on db.ApprovalLog;
}