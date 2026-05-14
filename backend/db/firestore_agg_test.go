package db

import (
	"testing"

	"cloud.google.com/go/firestore"
	firestorepb "cloud.google.com/go/firestore/apiv1/firestorepb"
)

// The Firestore Go SDK populates AggregationResult values with
// *firestorepb.Value (see query.go:1737 in v1.18.0, which copies
// res.Result.AggregateFields — a map[string]*pb.Value — directly into the
// result map). The decoder must unwrap that proto value, not assume the
// SDK has already cast it to int64.

func TestFirestoreAggCount_ProtoIntegerValue(t *testing.T) {
	v := &firestorepb.Value{
		ValueType: &firestorepb.Value_IntegerValue{IntegerValue: 42},
	}
	result := firestore.AggregationResult{"c": v}

	got := firestoreAggCount(result, "c")
	if got != 42 {
		t.Fatalf("firestoreAggCount = %d, want 42 (proto IntegerValue unwrapping)", got)
	}
}

func TestFirestoreAggCount_MissingAlias(t *testing.T) {
	result := firestore.AggregationResult{}
	if got := firestoreAggCount(result, "c"); got != 0 {
		t.Fatalf("firestoreAggCount = %d, want 0 for missing alias", got)
	}
}

func TestFirestoreAggCount_NilProtoValue(t *testing.T) {
	result := firestore.AggregationResult{"c": (*firestorepb.Value)(nil)}
	if got := firestoreAggCount(result, "c"); got != 0 {
		t.Fatalf("firestoreAggCount = %d, want 0 for nil *firestorepb.Value", got)
	}
}
